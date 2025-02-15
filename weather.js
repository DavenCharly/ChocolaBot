import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export async function weatherCommand(message, args) {
    if (!args.length) {
        return message.reply("Chocola needs you to specify a location! Like `!!weather London`or `!!Weather Paris`.");
    }

    const location = args.join(" ");
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) return message.reply(`Weather API key's not configured! Tell @<950791429255471114> he needs to add it to his .env file. <:SurrenderNyow:1335062346460041236>`);

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return message.reply("Couldn't fetch weather data. Please check the location name.");
        }

        const data = await response.json();

        // Build the weather embed
        const weatherEmbed = new EmbedBuilder()
            .setTitle(`☁️ Weather in ${data.name}, ${data.sys.country}`)
            .setDescription(`🌦️ ${data.weather[0].description}`)
            .addFields(
                { name: "🌡️ Temperature", value: `${data.main.temp}°C`, inline: true },
                { name: "🌡️ Feels Like", value: `${data.main.feels_like}°C`, inline: true },
                { name: "💧 Humidity", value: `${data.main.humidity}%`, inline: true },
                { name: "🌬️ Wind Speed", value: `${data.wind.speed} m/s`, inline: true }
            )
            .setTimestamp()
            .setColor("#00aaff");

        message.channel.send({ embeds: [weatherEmbed] });

    } catch (err) {
        console.error("Error fetching weather data:", err);
        message.reply("Oops! Chocola couldn't fetch the weather. Try again later!");
    }
}
