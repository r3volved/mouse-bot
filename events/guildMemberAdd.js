// This event executes when a new member joins a server
// The default welcomeMessage is in the config.json file

module.exports = (client, member) => {

    if (member.user.bot) return; // Prevents botception!

    const settings = client.settings.get(member.guild.id);

    // If the guild has pointsEnabled, then when a new member joins the guild
    // we'll set their points to zero and give them the first role reward
    if (settings.pointsEnabled === "true") {
        const guildUser = member.guild.id + member.id;
        const points = 0;
        const roleName = client.config.roleRewards.find(l => l.level === points).name;
        client.pointsTable.set(guildUser, points);
        client.assignRole(member, roleName);
    }

    // If welcome is off, don't welcome the user
    // Welcome is on by default
    if (settings.welcomeEnabled === "true") {
        // Replace the placeholders in the welcome message with actual data
        const welcomeMessage = settings.welcomeMessage.replace(/{{user}}/g, member.user).replace(/{{server}}/g, member.guild.name).replace(/{{prefix}}/g, settings.prefix);

        // Send the welcome message to the aChannel set in the config file
        client.aMessage(member.guild, welcomeMessage);
    }

};
