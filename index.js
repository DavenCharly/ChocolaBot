import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import express from 'express';
import { weatherCommand } from './weather.js';
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


// Load or initialize XP data
let xpData = {};
try {
  if (fs.existsSync(xpFile)) {
    xpData = JSON.parse(fs.readFileSync(xpFile, 'utf8'));
  }
} catch (err) {
  console.error('Error loading XP data:', err);
  xpData = {};
}

// Function to save XP data safely
async function saveXPData() {
  try {
    await fs.promises.writeFile(xpFile, JSON.stringify(xpData, null, 2));
  } catch (err) {
    console.error('Error saving XP data:', err);
  }
}

const xpCooldown = new Map();
const cooldownTime = 10000; // 10 seconds

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- XP System ---
  const now = Date.now();
  const userId = message.author.id;

  if (!xpCooldown.has(userId) || now - xpCooldown.get(userId) >= cooldownTime) {
    xpCooldown.set(userId, now);

    if (!xpData[userId]) {
      xpData[userId] = { xp: 0, level: 0 };
    }

    const xpGain = Math.floor(Math.random() * 10) + 1;
    xpData[userId].xp += xpGain;

    const newLevel = Math.floor(0.1 * Math.sqrt(xpData[userId].xp));
    if (newLevel > xpData[userId].level) {
      xpData[userId].level = newLevel;
      message.channel.send(`🎉 Congrats ${message.author.username}, you reached **level ${newLevel}**!`);
    }

    await saveXPData();
  }

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
  } else if (command === 'resetleaderboard') {
    if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.channel.send(`What?! You don’t have permission for that, <@${message.author.id}>!`);
    }

    message.channel.send("Mmm~ Are you absolutely sure you want to reset the leaderboard? Type 'yes' to confirm, 'no' to cancel.")
      .then(() => {
        const filter = response => response.author.id === message.author.id;
        message.channel.awaitMessages({ filter, time: 15000, max: 1 })
          .then(collected => {
            const reply = collected.first();
            if (!reply) return message.channel.send("Oh no! Chocola didn’t hear you in time... The reset is canceled!");

            if (reply.content.toLowerCase() === 'yes') {
              xpData = {};
              saveXPData().then(() => message.channel.send("Yay~! The leaderboard is all reset now! 🎉"));
            } else {
              message.channel.send("Awww, okay! Chocola won’t reset it... Maybe next time!");
            }
          })
          .catch(() => message.channel.send("Oh no! Chocola didn’t hear you in time... The reset is canceled!"));
      });
  } else if (command === 'shutdown') {
    if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.channel.send(`Ehh?! You don’t have permission to do that, <@${message.author.id}>!`);
    }
  
    message.channel.send("Mmm~ Chocola is going to take a nap now! 💤").then(() => {
      process.exit(0);
    });
  }
  else if (command === 'leaderboard') {
    let currentXpData = {};
    try {
      if (fs.existsSync(xpFile)) {
        currentXpData = JSON.parse(fs.readFileSync(xpFile, 'utf8'));
      }
    } catch (err) {
      console.error('Error reloading XP data:', err);
    }
  
    const sorted = Object.entries(currentXpData).sort((a, b) => b[1].xp - a[1].xp);
    if (sorted.length === 0) return message.channel.send("No XP data available yet!");
  
    const embed = new EmbedBuilder()
      .setTitle("🏆 Leaderboard")
      .setColor("#ff66b2")
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp();
  
    let leaderboardText = "";
    for (let i = 0; i < Math.min(sorted.length, 10); i++) {
      const [userId, data] = sorted[i];
      leaderboardText += `**${i + 1}. <@${userId}>** - XP: \`${data.xp}\` (Level \`${data.level}\`)\n`;
    }
  
    embed.setDescription(leaderboardText);
    message.channel.send({ embeds: [embed] });
  }})
