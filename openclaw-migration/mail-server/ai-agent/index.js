import { GoogleGenerativeAI } from "@google/generative-ai";
import Imap from "node-imap";
import { simpleParser } from "mailparser";
import fetch from "node-fetch";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const imapConfig = {
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASS,
  host: process.env.MAIL_SERVER,
  port: 143,
  tls: false,
  authTimeout: 3000
};

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = "-1002446700010"; // Chat ID from existing Renace agent

async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: telegramChatId, text: message, parse_mode: "Markdown" })
  });
}

async function summarizeEmail(subject, body) {
  try {
    const prompt = `Resume este correo electrónico de forma profesional y concisa: 
    Asunto: ${subject}
    Contenido: ${body}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini Error:", err);
    return "No se pudo generar el resumen.";
  }
}

const imap = new Imap(imapConfig);

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

imap.on("ready", () => {
  console.log("IMAP Agent Ready - Polling for new mail...");
  imap.on("mail", (numNewMsgs) => {
    openInbox((err, box) => {
      if (err) throw err;
      const f = imap.seq.fetch(box.messages.total + ":*", { bodies: "" });
      f.on("message", (msg, seqno) => {
        msg.on("body", (stream, info) => {
          simpleParser(stream, async (err, mail) => {
            if (err) throw err;
            console.log("New Email Received:", mail.subject);
            const summary = await summarizeEmail(mail.subject, mail.text);
            const msgBody = `📧 *Nuevo Correo:* ${mail.subject}\n\n🤖 *Resumen IA:* ${summary}\n\n👤 *Enviado por:* ${mail.from.text}`;
            await sendTelegram(msgBody);
          });
        });
      });
    });
  });
});

imap.on("error", (err) => console.error("IMAP error:", err));
imap.on("end", () => console.log("IMAP connection ended"));

imap.connect();
