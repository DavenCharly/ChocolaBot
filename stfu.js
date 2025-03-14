//Chocola should shut it
export const stfuCommand = (client, message) => {
    // Only allow specific users to shut down the bot
    const allowedUsers = ['950791429255471114' ,'467958507258380289' , '955154119314767963']; // Allow me and those other 🥷🏿 to shut her up
    
    if (!allowedUsers.includes(message.author.id)) {
      return message.reply("Chocola refuses! You can't tell her to shut down! >:(");
    }
  
    // Inform the user that the bot will shut down
    message.reply("Oh, alright :( Chocola's going to sleep then..💤");
    
    // Log the shutdown
    console.log("Bot has been shut down by", message.author.tag);
  
    setTimeout(() => {
        client.destroy();
        process.exit(0);  
      }, 2000); 
    };
  