import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import fetch from 'node-fetch';
import { weatherCommand } from './weather.js';
console.log(fs);
import dotenv from 'dotenv'; // Load environment variables from .env file
dotenv.config();
const xpFile = './xp.json';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Needed to read messages
    ]
});


const prefix = '!!'; // Command prefix

// Bot Login (Using the token from .env)
client.login(process.env.BOT_TOKEN);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => { 
  if (message.author.bot || !message.content.startsWith(prefix)) return; // Ignore bots & messages without prefix

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'remindme') {
      remindMeCommand(message, args);
  } else if (command === 'timer') {
      timerCommand(message, args);
  } else if (command === 'weather') {
      weatherCommand(message, args);
  } else if (command === 'resetleaderboard') {
      // Check if the user has administrator permissions.
      if (!message.member.permissions.has((PermissionsBitField.Flags.Administrator))) {
          return message.channel.send(`What?! You don’t have permission for that, <@${message.author.id}>! Chocola won’t let you do naughty things!`);
      }

      // Asks for confirmation
      message.channel.send("Mmm~ Are you absolutely sure you want to reset the leaderboard? If you *really* want to, just type 'yes' to reset it! Type 'no' to cancel.")
      .then(() => {
          const filter = response => {
              return response.content.toLowerCase() === 'yes' || response.content.toLowerCase() === 'no';
          };

          message.channel.awaitMessages({ filter, time: 15000, max: 1, errors: ['time'] })
              .then(collected => {
                  const reply = collected.first();
                  if (reply.content.toLowerCase() === 'yes') {
                      // Reset the xpData object.
                      xpData = {};
                      // Write the empty data back to xp.json.
                      fs.promises.writeFile(xpFile, JSON.stringify(xpData, null, 2))
                          .then(() => {
                              message.channel.send("Yay~! The leaderboard is all reset now! Chocola hopes you’re happy~! 🎉");
                          })
                          .catch(err => {
                              console.error("Error resetting leaderboard:", err);
                              message.channel.send("Oops! Chocola made a mistake! There was an error while resetting the leaderboard... 😭");
                          });
                  } else {
                      message.channel.send("Awww, okay! Chocola won’t reset it... Maybe next time!");
                  }
              })
              .catch(err => {
                  message.channel.send("Oh no! Chocola didn’t hear you in time... The reset is canceled! Please reply faster next time!");
              });
      });
  }
});

    


// ---------------------------
// REMIND ME & TIMER COMMANDS
// ---------------------------

function remindMeCommand(message, args) {
    if (args.length < 2) {
        return message.reply("That's not how the command works! It should be like this: \`!!remindme <time> <message>\` Like,``!!remindme 10m Give Chocola Headpats)`` !*");
    }

    const timeString = args.shift(); // First argument is the time
    const reminderText = args.join(' '); // Rest is the message
    const timeMs = parseTime(timeString);

    if (!timeMs) {
        return message.reply("Chocola thinks that's not the right time format! You should use **s** for seconds, **m** for minutes, or **h** for hours!.");
    }

    message.reply(`OK ${message.author}! Chocola will remind you in **${timeString}** ~`);

    setTimeout(() => {
      message.channel.send(`${message.author}, you wanted Chocola to remind you! Here's your **reminder** :  ${reminderText}`).catch(() => {
        });
    }, timeMs);
}

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

function timerCommand(message, args) {
    if (args.length < 1) {
        return message.reply("Chocola thinks that's not how the command works! It should be used like that: `!timer <time>`");
    }

    const timeString = args[0];
    const timeMs = parseTime(timeString);

    if (!timeMs) {
        return message.reply("You didn't use the right time format! `s` is for *seconds*, `m` for minutes, and `h` for hours!");
    }

    message.reply(`⏳ OK! Chocola has started the timer, she'll remind you when it's done in **${timeString}**!!`);

    setTimeout(() => {
        message.reply(`⏰ Time's up!`);
    }, timeMs);
}

// ---------------------
// XP SYSTEM & LEADERBOARD
// ---------------------


let xpData = {};
try {
  xpData = JSON.parse(fs.readFileSync(xpFile, 'utf8'));
} catch (err) {
  xpData = {};
}

const xpCooldown = new Map();
const cooldownTime = 10000; // 10 seconds

client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
  
    // Handle XP and level-up system
    const now = Date.now();
    const userId = message.author.id;
  
    if (xpCooldown.has(userId) && now - xpCooldown.get(userId) < cooldownTime) {
      return;
    }
  
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
  
    try {
      fs.promises.writeFile(xpFile, JSON.stringify(xpData, null, 2));
    } catch (err) {
      console.error('Error writing XP file:', err);
    }
  
    // Handle leaderboard command
    if (message.content.toLowerCase().startsWith(`${prefix}leaderboard`)) {
      const sorted = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
      if (sorted.length === 0) return message.channel.send("No XP data available yet!");
  
      const topUserId = sorted[0] ? sorted[0][0] : null; // Get the user ID of the top player
      const topUser = topUserId ? await client.users.fetch(topUserId).catch(() => null) : null;
      const topUsername = topUser ? topUser.username : "Unknown";
  
      const embed = new EmbedBuilder()
        .setTitle("🏆 Leaderboard")
        .setColor("#ff66b2") // Pink, change as you like
        .setThumbnail(client.user.displayAvatarURL()) // Bot's avatar as thumbnail
        .setFooter({ text: `${topUsername}, your days are counted! <:SurrenderNyow:1335062346460041236>`, iconURL: message.author.displayAvatarURL() })
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
  
    // Handle other commands like 'remindme', 'timer', etc.
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const command = args.shift().toLowerCase();
  
      if (command === 'remindme') {
        remindMeCommand(message, args);
      } else if (command === 'timer') {
        timerCommand(message, args);
      } else if (command === 'weather') {
        weatherCommand(message, args);
      } else if (command === 'resetleaderboard') {
        // Check for admin permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.channel.send(`What?! You don’t have permission for that, <@${message.author.id}>! Chocola won’t let you do naughty things!`);
        }
  
        // Ask for confirmation
        message.channel.send("Mmm~ Are you sure you want to reset the leaderboard? Type 'yes' to confirm, 'no' to cancel.")
          .then(() => {
            const filter = response => response.content.toLowerCase() === 'yes' || response.content.toLowerCase() === 'no';
            message.channel.awaitMessages({ filter, time: 15000, max: 1, errors: ['time'] })
              .then(collected => {
                const reply = collected.first();
                if (reply.content.toLowerCase() === 'yes') {
                  xpData = {};
                  fs.promises.writeFile(xpFile, JSON.stringify(xpData, null, 2))
                    .then(() => message.channel.send("Yay~! The leaderboard is reset!"))
                    .catch(err => {
                      console.error("Error resetting leaderboard:", err);
                      message.channel.send("Oops! Chocola made a mistake while resetting the leaderboard...");
                    });
                } else {
                  message.channel.send("Awww, okay! Chocola won’t reset it...");
                }
              })
              .catch(err => {
                message.channel.send("Oh no! Chocola didn’t hear you in time... The reset is canceled!");
              });
          });
      }
    }
  })
