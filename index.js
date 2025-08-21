//version:1.0.0
//name:APPWHATs-BOT
//author:user06a0r
//FOR FRIENDLY USE ONLY
//©user06a0r 2025
//GITHUB PROJECT

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");


const fs = require("fs");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const P = require("pino");
const { Boom } = require("@hapi/boom");

function getMentionedIds(text) {
  // very simple: expects @1234567890 or @1234567890@s.whatsapp.net
  const r = [];
  const re = /@?(\d{9,15})(?:@s\.whatsapp\.net)?/g;
  let m;
  while ((m = re.exec(text)) !== null) r.push(m[1] + "@s.whatsapp.net");
  return r;
}

const OWNER_NUMBERS = ["OWNER PHONE NUMBER",""]; //Replace with your phone number
const PREFIX = "!"; //Replace if you want.

const warnedUsers = {};
const MAX_WARNS = 3; //Replace if you want.

function getName(id) {
  return id.split("@")[0];
}

function isOwner(jid) {
  const id = jid?.split?.("@")?.[0] || jid;
  return OWNER_NUMBERS.includes(id);
}

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // (deprecated)
    logger: P({ level: 'silent' }),
    browser: ["APPWHATs-BOT", "Chrome", "120.0.0.0"],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on("creds.update", saveCreds);
  

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        console.log(`📸 Please scan the QR code to log in :\n`);
        qrcode.generate(qr, { small: true });
      }
    if (connection === "close") {
      if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
        startBot();
      }
    } else if (connection === "open") {
      console.log("✅ THE BOT HAS BEEN SUCCESSFULLY CONNECTED");
    }
  });

// OPTIONAL :
  
 // sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
   // for (let user of participants) {
     // const tag = `@${getName(user)}`;
    // if (action === "add") {
      // const ppUrl = await sock.profilePictureUrl(user, 'image').catch(() => null);
       // await sock.sendMessage(id, {
         // image: { url: ppUrl || "https://static.vecteezy.com/system/resources/previews/036/280/650/non_2x/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-illustration-vector.jpg" },
         // caption: `✨ Welcome ${tag} !`, mentions: [user],
       // });
     // } else if (action === "remove") {
       // await sock.sendMessage(id, { text: `🚪 ${tag} Goodbye !`, mentions: [user] });
     // }
   // }
 // });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (!text.startsWith(PREFIX)) return;

    const command = text.slice(1).split(" ")[0].toLowerCase();
    const args = text.split(" ").slice(1);
    const tag = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    const isCmd = text.startsWith(PREFIX);
    if (!isCmd) return;

    const isOwner = OWNER_NUMBERS.includes(sender.replace("@s.whatsapp.net", ""));

     
    if (command === "godmod") {
      if (!isOwner) return await sock.sendMessage(from, { text: "❌ Only the owner of the bot can use this command." });
      if (!from.endsWith("@g.us")) return await sock.sendMessage(from, { text: `⚠️ ${PREFIX}godmod works only in groups.`});
      try {
        const promoteId = msg.key.participant || (sender + "@s.whatsapp.net");
        await sock.groupParticipantsUpdate(from, [promoteId], "promote");
        return await sock.sendMessage(from, { text: "🛡️ Godmod activated - Your are ADMIN" });
      } catch (e) {
        console.error(e);
        return await sock.sendMessage(from, { text: "⚠️ Godmod Error : bot must be group administrator." });
      }
    }


    if (command === "nuke") {
      if (!isOwner) return await sock.sendMessage(from, { text: "❌  Only the owner of the bot can use this command." });
      if (!from.endsWith("@g.us")) return await sock.sendMessage(from, { text: `⚠️ ${PREFIX}nuke works only in groups.` });
      try {
        const meta = await sock.groupMetadata(from);
        const participants = meta.participants.map(p => p.id);
        const toKick = participants.filter(p => !OWNER_NUMBERS.includes(p.split("@")[0]));
        for (const id of toKick) {
          try { await sock.groupParticipantsUpdate(from, [id], "remove"); } catch(e){}
        }
        return await sock.sendMessage(from, { video: fs.readFileSync('nukev.mp4'),
                                              caption : `💣 Nuke completed. ${toKick.length} users have been kicked.\n\n"💣 𝑵𝑼𝑲𝑬𝑫 𝑩𝒀 APPWHATs BOT 💣"`,
                                              gifPlayback: true
        });
      } catch (e) {
        console.error(e);
        return await sock.sendMessage(from, { text: "⚠️ Error Nuke (PERMISSION?)." });
      }
    }


      if (command === "addowner") {
      if (!isOwner) return await sock.sendMessage(from, { text: "❌  Only the owner of the bot can use this command." });
      const m = getMentionedIds(text);
      if (!m.length) return await sock.sendMessage(from, { text: `Use ${PREFIX}addowner @number`});
      for (const id of m) {
        const short = id.split("@")[0];
        if (!OWNER_NUMBERS.includes(short)) OWNER_NUMBERS.push(short);
      }
      return await sock.sendMessage(from, { text: `✅ Owner aggiunti: ${m.join(", ")}` });
    }


        if (command === "delowner") {
      if (!isOwner) return await sock.sendMessage(from, { text: "❌ Only the owner of the bot can use this command." });
      const m = getMentionedIds(text);
      if (!m.length) return await sock.sendMessage(from, { text: `Use ${PREFIX}delowner @number` });
      for (const id of m) {
        const short = id.split("@")[0];
        const idx = OWNER_NUMBERS.indexOf(short);
        if (idx !== -1) OWNER_NUMBERS.splice(idx,1);
      }
      return await sock.sendMessage(from, { text: `✅ Owner : ${m.join(", ")} has been deleted.` });
    }


    if (command === "banuser") {
      if (!isOwner) return await sock.sendMessage(from, { text: "❌ Only the owner of the bot can use this command." });
      if (!from.endsWith("@g.us")) return await sock.sendMessage(from, { text: "⚠️ Ban works only in groups." });
      const mentioned = getMentionedIds(text);
      if (!mentioned.length) return await sock.sendMessage(from, { text: `Use ${PREFIX}banuser @number`});
      try {
        await sock.groupParticipantsUpdate(from, mentioned, "remove");
        return await sock.sendMessage(from, { text: `✅ User : ${mentioned.join(", ")} has been banned.` });
      } catch (e) {
        console.error(e);
        return await sock.sendMessage(from, { text: "⚠️ Error during removal (check bot permissions)." });
      }
    }


    if (command === "warn" && tag) {
      warnedUsers[tag] = (warnedUsers[tag] || 0) + 1;
      if (warnedUsers[tag] >= MAX_WARNS) {
        await sock.sendMessage(from, { text: `🚫 @${getName(tag)} Received too many warns and was removed.`, mentions: [tag] });
        await sock.groupParticipantsUpdate(from, [tag], "remove");
        warnedUsers[tag] = 0;
      } else {
        await sock.sendMessage(from, { text: `⚠️ @${getName(tag)} has been warned. (${warnedUsers[tag]}/${MAX_WARNS})`, mentions: [tag] });
      }
    }

    if (command === "clearwarn" && tag) {
      warnedUsers[tag] = 0;
      await sock.sendMessage(from, { text: `♻️ Warn as been reset for @${getName(tag)}`, mentions: [tag] });
    }

    if (command === "help") {
      return sock.sendMessage(from, {
                                              image: { url: "https://t4.ftcdn.net/jpg/12/93/43/59/360_F_1293435933_GqRrHmb3I4w74oX3b9Xw24xs9G5BqY6z.jpg" },
                                              caption : 
        `
> *HELP CONTROL PANNEL*
────────────────
⤷ *AVAIBLE COMMANDS :*
> ${PREFIX}addowner @
> ${PREFIX}delowner @
> ${PREFIX}warn @
> ${PREFIX}clearwarn @
> ${PREFIX}banuser @
> ${PREFIX}nuke
> ${PREFIX}godmod
────────────────
🏴‍☠️ 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐩𝐞𝐝 𝐛𝐲 𝐮𝐬𝐞𝐫𝟎𝟔𝐚𝟎𝐫 🏴‍☠️`,
                                              gifPlayback: true
      });
    }
  });
}

startBot();
