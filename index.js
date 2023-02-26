const Discord = require('discord.js');
const {GatewayIntentBits, PermissionsBitField, GuildMember, Modal} = require('discord.js');
require('colors');
const _ = require('lodash');

const screenshotChannel = '1072239984343527534';
const guildId = '997112344360534098';
const reportChannelConfig = '1015386813206110351';
const emojiUpvote = '👍';
const emojiDownvote = '👎';
const clientToken = ''; // BOT TOKEN HERE

const client = new Discord.Client(
    {
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.AutoModerationConfiguration,
            GatewayIntentBits.AutoModerationExecution,
            GatewayIntentBits.GuildBans,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.MessageContent
        ],
        partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION", "GUILD_SCHEDULED_EVENT"]
    }
)

client.login(clientToken)
    .catch((e) => {
            console.error('Client failed to load.'.red);
            console.log(e);
            process.exit(404);
        }
    )

let staffRoles = async (guild) => {
    return new Promise(async (resolve, reject) => {
        if (guild.roles.cache.size > 0) {
            let staffRoles = guild.roles.cache.filter(role =>
                role.permissions.any([
                    PermissionsBitField.Flags.Administrator,
                    PermissionsBitField.Flags.KickMembers,
                    PermissionsBitField.Flags.BanMembers,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageRoles,
                    PermissionsBitField.Flags.ManageGuild,
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.ManageWebhooks,
                    PermissionsBitField.Flags.ModerateMembers
                ]) && !(role.members.size === role.members.filter(m => m.user.bot).size) &&
                role.id !== guild.roles.everyone.id
            ).sort(function (a, b) {
                return b.rawPosition - a.rawPosition;
            })
            if (staffRoles.size) {
                resolve(staffRoles);
            } else reject(null);
        } else reject(null);
    })
}

async function delay(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    })
}

let urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/g;
// 9b Screenshots
client.on('messageCreate', async (message) => {
    if (!message.channelId || (message.channelId && message.channelId !== screenshotChannel)) return;
    if (message.author.bot) return;
    let att = [];
    if (message.attachments.size) {
        await message.attachments.map(e => e.contentType).forEach(e => att.push(e));
    }
    if (message.content) {
        let matches = await message.content.match(urlRegex);
        if (matches) {
            let tmt = async () => {
                return new Promise(async (resolve, reject) => {
                    let out = setTimeout(() => {
                        reject();
                    }, 2000);
                    while (!message.embeds.length) {
                        await delay(50);
                    }
                    clearTimeout(out);
                    resolve();
                })
            }
            await tmt();
        }
    }
    if (message.embeds.length) {
        await message.embeds.map(e => e.type).forEach(e => att.push(e));
    }

    let member = await message.guild.members.fetch(message.author.id);

    let images = ['image/png', 'image/jpeg', 'image', 'image/webp'];
    let gifs = ['image/gif', 'gifv'];
    let videos = ['video', 'video/mp4', 'video/webm', 'video/mov', 'video/wav', 'video/quicktime'];
    let allMentions = [];
    if (att.some(e => images.includes(e)) || att.some(e => gifs.includes(e)) || att.some(e => videos.includes(e))) {
        try {
            await message.react(emojiUpvote);
            await message.react(emojiDownvote);
        } catch (e) {

        }
    } else {
        let staff = (await staffRoles(message.guild)).map(role => role.id);
        let shouldDelete = !member._roles.some(r => staff.includes(r)); // !
        let mentions = false;
        if (message.mentions) {
            let men = message.mentions.everyone;
            if (message.mentions.users.filter(e => !e.bot).size) {
                men = true;
                message.mentions.users.filter(e => !e.bot).forEach(m => {
                    allMentions.push(`<@${m.id}>`);
                })
            }
            if (message.mentions.roles.size) {
                men = true;
                message.mentions.roles.forEach(r => {
                    allMentions.push(`<@&${r.id}>`);
                })
            }
            if (men) {
                mentions = true;
            }
        }
        if (shouldDelete) {
            try {
                await message.delete();
            } catch (e) {

            }
        }

        if (mentions && shouldDelete) {
            let reportChannel = await message.guild.channels.fetch(reportChannelConfig);
            if (reportChannel) {
                let em = {
                    "type": "rich",
                    "title": "",
                    "description": `<@${message.author.id}>`,
                    "color": 0x00FFFF,
                    "fields": [ ],
                    "author": {
                        "name": `User timed out in screenshot channel.`
                    }
                };

                if(message.content) {
                    em.fields.push({name: "Message", value: _(message.content).truncate(500)});
                }

                if(allMentions) {
                    em.fields.push({name: "Mentions", value: _(allMentions.join(', ')).truncate(500)});
                }

                try {
                    await reportChannel.send({
                        embeds: [em]
                    });
                } catch (e) {

                }
            }
            try {
                await member.timeout(1000 * 60 * 10, 'Pinging people without screenshot in #screenshots.');
            } catch (e) {

            }
        }
    }
})

let chatReporter;
let pingsArray = new Map();

client.on('messageCreate', async (message) => {
    if (message.guildId !== guildId || !message.channel || !message.author) return;
    if (!chatReporter) {
        chatReporter = await message.guild.channels.fetch(reportChannelConfig);
    }

    if (!message.mentions.users.filter(m => !m.bot).map(m => m.id).length && !message.mentions.roles.map(r => r.id).length) return;

    let data = {
        user: message.author.id,
        channel: message.channelId,
        pings: {
            users: message.mentions.users.filter(m => !m.bot).map(m => m.id),
            roles: message.mentions.roles.map(r => r.id)
        }
    }

    pingsArray.set(message.id, data);
})

let logMessage = async (data, message) => {
    let guild = await message.guild;
    if (!message.author.id) return;
    let antagonist = await guild.members.fetch(message.author.id);
    let embed = new Discord.EmbedBuilder()
        .setColor(data.pings.roles ? '#c6a143' : '#43C6AC')
        .setAuthor({name: 'Ghost Ping Detector'})
        .setDescription(`User: ${antagonist.user.tag} <@${data.user}>`)
        .setFooter({text: `${message.author.id} | In #${message.channel.name}`})

    let fields = [];

    if (data.pings.users.length) {
        fields.push({name: `Users - ${data.pings.users.length}`, value: data.pings.users.map(u => `<@${u}>`).join(' ')});
    }

    if (data.pings.roles.length) {
        fields.push({name: `Roles - ${data.pings.roles.length}`, value: data.pings.roles.map(u => `<@&${u}>`).join(' ')});
    }

    if(fields) {
        embed.addFields(fields);
    }

    if (!chatReporter) {
        chatReporter = await guild.channels.fetch(reportChannelConfig);
    }

    try {
        await chatReporter.send({embeds: [embed]});
    } catch {

    }

    // DM The user(s)
    if (data.pings.users.length && data.user) {
        let targets = await Promise.all(data.pings.users.filter(u => u !== message.author.id).map(async u => await message.guild.members.fetch(u))); // .filter(u => u !== data.user)
        targets.forEach(async (user) => {
            let channel;
            try {
                channel = await user.createDM();
            } catch {
                return;
            }

            if (channel) {
                let embed = new Discord.EmbedBuilder()
                    .setColor('#43C6AC')
                    .setAuthor({name: message.author.username, iconURL: message.author.avatarURL({dynamic: true})})
                    .setFooter({text: `${message.author.id} | In #${message.channel.name}`})
                    .setDescription(message.content)
                let attachments = message.attachments.map(a => {
                    return {attachment: a.url, name: a.name}
                });
                channel.send({embeds: [embed], files: attachments});
            }
        })
    }
}

function hasOldPings(o, n) {
    for (let old of o) {
        let has = false;
        for (let nw of n) {
            if (old === nw) has = true;
        }
        if (!has) return false;
    }
    return true;
}

let messageUpdateOrDelete = async (message, old = null) => {
    let data = pingsArray.get(message.id);
    if (!data) return;
    if (old) {
        let matches = hasOldPings(old.mentions.users.filter(m => !m.bot).map(m => m.id), message.mentions.users.filter(m => !m.bot).map(m => m.id))
            && hasOldPings(old.mentions.roles.map(r => r.id), message.mentions.roles.map(r => r.id));
        if (!matches) {
            logMessage(data, message);
            pingsArray.delete(message.id);
        }
    } else {
        if (message.createdTimestamp + 3600 * 1000 > new Date().getTime()) {
            logMessage(data, message);
        }
        pingsArray.delete(message.id);
    }
}

client.on('messageDelete', (message) => {
    messageUpdateOrDelete(message).then(r => {
    })
});
client.on('messageUpdate', (old, updated) => {
    messageUpdateOrDelete(updated, old).then(r => {
    })
});

client.on('ready', () => {
    console.log('Client ready.');

    presence();
})

const presence = async () => {
    const delay = async (ms) => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, ms);
        })
    }

    while (true) {
        client.user.setPresence({activities: [{name: `on https://hue.st/`}]})

        await delay(60 * 60 * 1000);
    }
}
