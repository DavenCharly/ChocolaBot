import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
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

// Load or initialize XP data
let xpData = {};
try {
  xpData = JSON.parse(fs.readFileSync(xpFile, 'utf8'));
} catch (err) {
  xpData = {};
}

const xpCooldown = new Map();
const cooldownTime = 10000; // 10 seconds

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // --- XP System ---
  const now = Date.now();
  const userId = message.author.id;
  if (xpCooldown.has(userId) && now - xpCooldown.get(userId) < cooldownTime) {
    // If on cooldown, do nothing for XP purposes.
  } else {
    xpCooldown.set(userId, now);
setTimeout(() => xpCooldown.delete(userId), cooldownTime);
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
    try {
      await fs.promises.writeFile(xpFile, JSON.stringify(xpData, null, 2));
    } catch (err) {
      console.error('Error writing XP file:', err);
    }
  }
  
  // --- Command Handling ---
  // Only process commands if the message starts with the prefix.
  if (!message.content.startsWith(prefix)) return;
  
  // Split message into command and args.
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // Process commands.
  if (command === 'remindme') {
    remindMeCommand(message, args);
  } else if (command === 'timer') {
    timerCommand(message, args);
  } else if (command === 'weather') {
    weatherCommand(message, args);
  } else if (command === 'resetleaderboard') {
    // Admin permission check.
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.channel.send(`What?! You don’t have permission for that, <@${message.author.id}>!`);
    }
    message.channel.send("Mmm~ Are you absolutely sure you want to reset the leaderboard? Type 'yes' to confirm, 'no' to cancel.")
      .then(() => {
        const filter = response => {
            return (response.author.id === message.author.id) &&
                   (response.content.toLowerCase() === 'yes' || response.content.toLowerCase() === 'no');
          };
        message.channel.awaitMessages({ filter, time: 15000, max: 1, errors: ['time'] })
          .then(collected => {
            const reply = collected.first();
            if (reply.content.toLowerCase() === 'yes') {
              xpData = {};
              fs.promises.writeFile(xpFile, JSON.stringify(xpData, null, 2))
                .then(() => message.channel.send("Yay~! The leaderboard is all reset now! 🎉"))
                .catch(err => {
                  console.error("Error resetting leaderboard:", err);
                  message.channel.send("Oops! There was an error while resetting the leaderboard... 😭");
                });
            } else {
              message.channel.send("Awww, okay! Chocola won’t reset it... Maybe next time!");
            }
          })
          .catch(err => {
            message.channel.send("Oh no! Chocola didn’t hear you in time... The reset is canceled!");
          });
      });
  } else if (command === 'leaderboard') {
    const sorted = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
    if (sorted.length === 0) return message.channel.send("No XP data available yet!");
    const topUserId = sorted[0][0];
    const topUser = await client.users.fetch(topUserId).catch(() => null);
    const topUsername = topUser ? topUser.username : "Unknown";

    const embed = new EmbedBuilder()
      .setTitle("🏆 Leaderboard")
      .setColor("#ff66b2")
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `${topUsername}, your days are counted!`, iconURL: topUser.displayAvatarURL() })
      .setTimestamp();

    let leaderboardText = "";
    for (let i = 0; i < Math.min(sorted.length, 10); i++) {
      const [userId, data] = sorted[i];
      const user = await client.users.fetch(userId).catch(() => null);
      const username = user ? user.username : `Unknown User (${userId})`;
      leaderboardText += `**${i + 1}. ${username}** - XP: \`${data.xp}\` (Level \`${data.level}\`)\n`;
    }
    embed.setDescription(leaderboardText);
    message.channel.send({ embeds: [embed] });
  }
});

// --- Command Functions ---
function remindMeCommand(message, args) {
  if (args.length < 2) {
    return message.reply("Usage: `!!remindme <time> <message>`");
  }
  const timeString = args.shift();
  const reminderText = args.join(' ');
  const timeMs = parseTime(timeString);
  if (!timeMs) {
    return message.reply("Invalid time format! Use `s` for seconds, `m` for minutes, or `h` for hours.");
  }
  message.reply(`OK ${message.author}, I'll remind you in **${timeString}**!`);
  setTimeout(() => {
    message.channel.send(`${message.author}, here's your reminder: **${reminderText}**`);
  }, timeMs);
}

function timerCommand(message, args) {
  if (args.length < 1) {
    return message.reply("Usage: `!!timer <time>`");
  }
  const timeString = args[0];
  const timeMs = parseTime(timeString);
  if (!timeMs) {
    return message.reply("Invalid time format! Use `s` for seconds, `m` for minutes, or `h` for hours.");
  }
  message.reply(`⏳ Timer started for **${timeString}**!`);
  setTimeout(() => {
    message.reply("⏰ Time's up!");
  }, timeMs);
}

function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return null;
}
