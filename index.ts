import Core from "../../index.js";
import DiscordModule from "../discord/index.js";
import SlashCommandChannelInfo from "./slash-commands/twitch-channel-info.js";

import * as Discord from "discord.js";

class TwitchInDiscordCommandsModule {
	readonly name = "twitch-in-discord-commands" as const;
	readonly log = Core.log.makeFunctions(this.name);

	constructor() {
		DiscordModule
			.once("addAuthorizationFields", a => a
				.addPermissions(Discord.PermissionFlagsBits.UseApplicationCommands))
			.once("afterClientCreation", () => this.afterDiscordClientCreation());
	}

	protected afterDiscordClientCreation() {
		DiscordModule.slashCommands.push(SlashCommandChannelInfo());
	}
}
export default new TwitchInDiscordCommandsModule();