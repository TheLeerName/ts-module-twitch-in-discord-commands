import Core from "../../../index.js";
import Module from "../index.js";
import TwitchModule from "../../twitch/index.js";
import { SlashCommand } from "../../discord/slash-commands/index.js";
import { getChoices_twitchChannel } from "./index.js";

import { EmbedBuilder } from "discord.js";
import * as Twitch from "twitch.ts";

export default () => {
	const c = new SlashCommand()
	.setGlobal()
	.setVersion(2)
	.setCooldown(5000)
	.setName("twitch-channel-info")
	.setDescription(`Sends info about specified twitch channel`)
	.setDescriptionLocalization("ru", `Отправляет информацию об указанном Twitch-канале`)
	.setAutocomplete(async(interaction) => {
		const focused = interaction.options.getFocused();
		console.log(focused);
		const choices = await getChoices_twitchChannel(focused);
		await interaction.respond(choices);
	}).setChatInput(async(interaction) => {
		const start = Date.now();
		await interaction.deferReply();

		const query = interaction.options.getString("query", true);

		const args: any = {
			user: `${interaction.user.username} (${interaction.user.id})`,
			query
		};
		if (interaction.inCachedGuild()) {
			args.guild = `${interaction.guild.name} (${interaction.guild.id})`;
		}

		try {
			if (query.length < 1)
				throw new Error("Параметр query не указан");

			const resultGetUsers = await TwitchModule.authorization.request.withRefreshing(Twitch.Helix.GetUsers.axiosRequest, {
				id: query,
			});
			if (!resultGetUsers.ok)
				throw new Error(`Ошибка ${resultGetUsers.status} - ${resultGetUsers.message}`);
			if (resultGetUsers.data.length < 1)
				throw new Error("Указанный Twitch-канал не существует или был забанен");
			const user = resultGetUsers.data[0];

			const createdAtTimestamp = Math.floor(new Date(user.created_at).getTime() / 1000);
			const msg = {embeds: [new EmbedBuilder()
				.setTitle(`:notepad_spiral: Информация twitch-канала ${user.display_name}`)
				.setThumbnail(user.profile_image_url)
				.setFields(
					{
						name: "ID",
						value: `\`${user.id}\``
					},
					{
						name: "Ссылка на канал",
						value: `<https://twitch.tv/${user.login}>`
					},
					{
						name: "Канал создан",
						value: `<t:${createdAtTimestamp}:R> (<t:${createdAtTimestamp}:F>)`
					},
					{
						name: "Тип канала",
						value: `\`${user.broadcaster_type === "partner" ? "Партнёр" : (user.broadcaster_type === "affiliate" ? "Компаньон" : "Обычный")}\``
					},
					{
						name: "Тип пользователя",
						value: `\`${user.type === "admin" ? "Администратор" : (user.type === "global_mod" ? "Модератор" : (user.type === "staff" ? "Staff" : "Обычный"))}\``
					}
				)
				.setColor("#77b255")
			]};

			if (user.description.length > 0) msg.embeds[0].setDescription(user.description);
			if (user.offline_image_url.length > 0) msg.embeds[0].setImage(user.offline_image_url);

			const resultGetStreams = await TwitchModule.authorization.request.withRefreshing(Twitch.Helix.GetStreams.axiosRequest, {
				user_id: user.id, type: "live", first: 1,
			});
			if (!resultGetStreams.ok)
				throw new Error(`Ошибка ${resultGetStreams.status} - ${resultGetStreams.message}`);
			if (resultGetStreams.data.length > 0) {
				const stream = resultGetStreams.data[0];
				const startedAtTimestamp = Math.floor(new Date(stream.started_at).getTime() / 1000)
				msg.embeds[0].addFields({
					name: "🔴 Текущий стрим",
					value: `Название: ${stream.title}\nИгра/категория: ${TwitchModule.translateToRU_gameName(stream.game_name)}\nЗрителей: ${stream.viewer_count}\nНачат <t:${startedAtTimestamp}:R> (<t:${startedAtTimestamp}:F>)${stream.tags.length > 0 ? `\nТеги: ${stream.tags.join(", ")}` : ""}`
				});
				msg.embeds[0].setImage(stream.thumbnail_url);
				args.twitchStreamTitle = stream.title;
				args.twitchStreamCategory = `${stream.game_name} (${stream.game_id})`;
				args.twitchStreamStartedAt = stream.started_at;
				args.twitchStreamTags = stream.tags;
				args.twitchStreamThumbnailURL = stream.thumbnail_url;
				args.twitchStreamViewerCount = stream.viewer_count;
			}
			msg.embeds[0].setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`});
			await interaction.editReply(msg);

			args.twitchChannelID = user.id;
			args.twitchChannelName = user.display_name;
			args.twitchChannelDescription = user.description;
			args.twitchChannelCreatedAt = user.created_at;
			args.twitchChannelChannelType = user.broadcaster_type;
			args.twitchChannelUserType = user.type;
			args.twitchChannelThumbnailURL = user.profile_image_url;
			args.twitchChannelOfflineImageURL = user.offline_image_url;
			Module.log.info(`Command ${c.name} success`, {args});
		}
		catch(error) {
			await interaction.editReply({embeds: [new EmbedBuilder()
				.setTitle(`:x: Ошибка!`)
				.setDescription(`\`\`\`\n${error.message}\n\`\`\``)
				.setColor("#dd2e44")
				.setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`})
			]});

			Module.log.error(`Command ${c.name} failed`, {error, args});
		}
	});
	c.addStringOption(option => option
		.setName("query")
		.setDescription("Twitch channel ID")
		.setDescriptionLocalization("ru", "ID Twitch-канала")
		.setRequired(true)
		.setMinLength(4)
		.setMaxLength(25)
		.setAutocomplete(true)
	);
	return c;
};