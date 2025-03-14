import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import express from 'express';
import { weatherCommand } from './weather.js';
import { stfuCommand } from './stfu.js'
import dotenv from 'dotenv';

dotenv.config();

const xpFile = './xp.json';
const prefix = '!!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.login(process.env.BOT_TOKEN);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Set up a basic Express web server for uptime pinging.
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Ping endpoint
app.get('/ping', (req, res) => {
  if (client.isReady()) {
    res.status(200).send("Chocola's Alive!");
  } else {
    res.status(500).send('I think Chocola is deadge');
  }
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});

// Remind & Timer time
function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;

  return null;
}

////////////////////////////
//    TIMER COMMAND
///////////////////////////

function timerCommand(message, args) {
  if (args.length < 1) {
      return message.reply("Chocola thinks that's not how the command works! It should be used like this: `!!timer <time>`");
  }

  const timeString = args[0];
  const timeMs = parseTime(timeString);

  if (!timeMs) {
      return message.reply("You didn't use the right time format! `s` is for *seconds*, `m` for *minutes*, and `h` for *hours*.");
  }

  message.reply(`⏳ Timer started for **${timeString}**! Chocola will remind you when it's done!`);

  setTimeout(() => {
      message.reply(`⏰ Time's up!`);
  }, timeMs);
}

//////////////////////////////
//        REMIND ME
//////////////////////////////

function remindMeCommand(message, args) {
  if (args.length < 2) {
      return message.reply("You need to specify both time and message! Example: `!!remindme 10m Feed Chocola`");
  }

  const timeString = args.shift(); // First argument is the time
  const reminderText = args.join(' '); // Rest is the reminder message
  const timeMs = parseTime(timeString);

  if (!timeMs) {
      return message.reply("Chocola doesn't understand that time format! Use `s` (seconds), `m` (minutes), or `h` (hours).");
  }

  message.reply(`OK! Chocola will remind you in **${timeString}**!`);

  setTimeout(() => {
      message.author.send(`⏰ Reminder: ${reminderText}`).catch(() => {
          message.channel.send(`⏰ Reminder for ${message.author}: ${reminderText}`);
      });
  }, timeMs);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  
  // --- Command Handling ---
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'remindme') {
    remindMeCommand(message, args);
  } else if (command === 'timer') {
    timerCommand(message, args);
  } else if (command === 'weather') {
    weatherCommand(message, args);
  } else if (command === 'stfu') {
    stfuCommand(client, message);
  }})
