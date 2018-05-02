module.exports = (client) => {


    /*
    --- MYSQL LOOKUP FUNCTION ---
    Establishes a connection with mySQL, then executes the sqlSyntax
    args replace "?" within the sqlSyntax
    db by default is "mousebot", can also be "swgoh"
    */
    client.doSQL = async (sqlSyntax, args, db = "mousebot") => {
        return new Promise((resolve, reject) => {
            try {

                // Attempt to establish a connection
                const mySQL = require("mysql");
                const sqlConnection = mySQL.createConnection({
                    host     : client.config.mySQL.host,
                    user     : client.config.mySQL.user,
                    password : client.config.mySQL.password,
                    database : db
                });
                try {
                    sqlConnection.connect();
                } catch (error) {
                    client.logger.error(`**Cannot connect to mySQL DB**\n${error.stack}`);
                    reject(error);
                }


                // Now we can actually do SQL stuff
                sqlConnection.query(sqlSyntax, args, function(error, result) {
                    sqlConnection.end();
                    if (error) {
                        if (error.code === "ENOTFOUND") {
                            error = `! ERROR : CONFIG\n : Could not connect to the defined database at ${error.host}`;
                        } else {
                            error = `! ERROR : CONFIG\n : ${error.sqlMessage}`;
                        }
                        reject(error);
                    }
                    resolve(result);
                });

            } catch (error) {
                client.logger.error(`doSQL function fail:\n${error.stack}`);
                reject(error);
            }
        });
    };


    /*
    ----- ERROR LOG -----
    */
    client.errlog = async (cmd, message, level, error) => {
        try {
            const permLevel = client.config.permLevels.find(l => l.level === level).name;
            const details = `${error.name}: ${error.message}`;
            return await client.doSQL(
                "INSERT INTO errlog (timestamp, command, channelId, userId, permLevel, details) VALUES (?, ?, ?, ?, ?, ?)",
                [new Date(), cmd.help.name, message.channel.id.toString(), message.author.id.toString(), permLevel, details]
            );
        } catch (error) {
            client.logger.error(`Failed to write to errlog:\n${error.stack}`);
        }
    };


    /*
    --- SWGOH.GG PROFILE CHECK ---

    Checks to see which method a user is inputing the profile and arguments and
    returns those
    */
    client.profileCheck = async (message, args) => {

        try {

            let id = message.author.id.toString();
            let username = undefined;
            let text = args.join(" ");
            let error = false;

            if (args[0]) {
                if (args[0].startsWith("~") || args[0].startsWith("--")) {
                    username = args[0].replace("~", "").replace("--", "");
                } else if (args[0].startsWith("http")) {
                    const start = args[0].indexOf("/u/");
                    if (start == -1) error = ("There is no username in this URL.");
                    const end = args[0].lastIndexOf("/");
                    username = args[0].slice(start + 3, end);
                    username = username.replace(/%20/g, " ");
                } else if (message.mentions.users.first() && message.mentions.users.first().bot === false) {
                    id = message.mentions.users.first().id.toString();
                    const results = await client.doSQL("SELECT username FROM profiles WHERE discordId = ?", [id]);
                    if (results.length > 0 || results != false) username = results[0].username;
                }

                if (username === undefined) {
                    const results = await client.doSQL("SELECT discordId FROM profiles WHERE username = ?", [args[0]]);
                    if (results.length > 0 || results != false) username = results[0].username;
                }

                if (username != undefined) text = args.slice(1).join(" ");
            }

            if (username === undefined) {
                if (message.profile && message.profile.username) username = message.profile.username;
            }

            if (username === undefined) error = `I can't find a profile for that username, try adding your (or their) swgoh.gg username with \`${message.settings.prefix}register\`.`;
            return [encodeURI(username), text, error];

        } catch (error) {

            const level = client.permlevel(message);
            client.errlog("profileCheck", message, level, error);
            client.logger.error(client, `profileCheck failure\n${error.stack}`);
        }
    };


};
