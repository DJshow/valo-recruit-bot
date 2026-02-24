import crypto from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const { DISCORD_PUBLIC_KEY: KEY, TABLE_NAME: TABLE } = process.env;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  try {
    // --- 1. 署名検証 ---
    const h = event.headers;
    const sig = h["x-signature-ed25519"] || h["X-Signature-Ed25519"];
    const ts = h["x-signature-timestamp"] || h["X-Signature-Timestamp"];
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body;
    const isVerified = crypto.verify(null, Buffer.from(ts + rawBody), publicKeyToKey(KEY), Buffer.from(sig, "hex"));
    if (!isVerified) return { statusCode: 401, body: "Bad signature" };

    const body = JSON.parse(rawBody || "{}");
    if (body.type === 1) return { statusCode: 200, body: JSON.stringify({ type: 1 }) };

    // --- 2. /valo コマンド処理（新規募集） ---
    if (body.type === 2 && body.data?.name === "valo") {
      const opts = Object.fromEntries(body.data.options?.map(o => [o.name, o.value]) || []);
      const item = {
        recruitId: crypto.randomUUID(),
        ownerId: body.member?.user?.id || body.user?.id,
        owner: body.member?.user?.username || body.user?.username || "unknown",
        start: opts.start ?? "未定",
        need: opts.need ?? 5,
        members: [], // 参加者リスト
        status: "open",
        createdAt: new Date().toISOString()
      };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(createResponse(item)) };
    }

    // --- 3. ボタン操作（参加・取り消し・終了） ---
    if (body.type === 3) {
      const [action, recruitId] = body.data.custom_id.split("_");
      const userId = body.member?.user?.id || body.user?.id;
      const userName = body.member?.user?.username || body.user?.username;

      // 現在のデータを取得
      const { Item: item } = await ddb.send(new GetCommand({ TableName: TABLE, Key: { recruitId } }));
      if (!item) return { statusCode: 200, body: JSON.stringify({ type: 4, data: { content: "⚠️ 募集が見つかりませんでした。", flags: 64 } }) };

      let updatedMembers = [...(item.members || [])];

      if (action === "join") {
        if (!updatedMembers.includes(userName)) updatedMembers.push(userName);
      } else if (action === "leave") {
        updatedMembers = updatedMembers.filter(m => m !== userName);
      } else if (action === "cancel") {
        if (item.ownerId !== userId) return { statusCode: 200, body: JSON.stringify({ type: 4, data: { content: "⚠️ 募集主以外は終了できません。", flags: 64 } }) };
        item.status = "closed";
      }

      // DB更新
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { recruitId },
        UpdateExpression: "SET members = :m, #s = :s",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":m": updatedMembers, ":s": item.status }
      }));

      item.members = updatedMembers;
      // 応答タイプ 7 は「元のメッセージを編集する」
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(createResponse(item, 7)) };
    }

    return { statusCode: 200, body: JSON.stringify({ type: 4, data: { content: "ok" } }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error" };
  }
};

// メッセージ表示を生成する関数（新規・更新共通）
function createResponse(item, type = 4) {
  const memberList = item.members.length > 0 ? `\n**参加者:** ${item.members.join(", ")}` : "";
  const isClosed = item.status === "closed";
  
  return {
    type: type,
    data: {
      content: `${isClosed ? "【募集終了】\n" : "### 🔫 VALORANT参加者募集\n"}**募集主:** ${item.owner}\n**開始:** ${item.start}\n**あと:** ${Math.max(0, item.need - item.members.length)} 名${memberList}`,
      components: isClosed ? [] : [{
        type: 1,
        components: [
          { type: 2, style: 3, label: "参加", custom_id: `join_${item.recruitId}` },
          { type: 2, style: 4, label: "取り消し", custom_id: `leave_${item.recruitId}` },
          { type: 2, style: 2, label: "募集終了", custom_id: `cancel_${item.recruitId}` }
        ]
      }]
    }
  };
}

function publicKeyToKey(hex) {
  const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(hex, "hex")]);
  return crypto.createPublicKey(`-----BEGIN PUBLIC KEY-----\n${der.toString("base64")}\n-----END PUBLIC KEY-----`);
}
