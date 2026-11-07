import Module from "../index.js";
import TwitchModule from "../../twitch/index.js";

import { type ApplicationCommandOptionChoiceData, Collection } from "discord.js";
import * as Twitch from "twitch.ts";

export type Choices = {
	array: ApplicationCommandOptionChoiceData<string>[];
	lastModifiedTimestamp: number;
};

export const choices_maxSize = 500;
export const choices_twitchChannel: Collection<string, Choices> = new Collection();
export async function getChoices_twitchChannel(focused: string) {
	const dateNow = Date.now();
	let choices = choices_twitchChannel.get(focused);
	if (!choices) {
		choices = {
			array: [],
			lastModifiedTimestamp: 67
		};
		choices_twitchChannel.set(focused, choices);
		if (choices_twitchChannel.size > choices_maxSize)
			choices_twitchChannel.delete(choices_twitchChannel.firstKey()!);
	}
	if (dateNow > choices.lastModifiedTimestamp + 60000) { // one minute
		while (choices.array.length > 0) choices.array.pop();

		if (focused.length > 0) {
			const result = await TwitchModule.authorization.request.withRefreshing(Twitch.Helix.SearchChannels.axiosRequest, {
				query: focused, first: 5,
			});
			if (!result.ok) {
				Module.log.error("Getting twitch channel results failed", {args: {
					name: "SearchChannels",
					status: result.status,
					message: result.message
				}});
				choices_twitchChannel.delete(focused);
				return choices.array;
			}
			for (const entry of result.data) choices.array.push({name: entry.display_name, value: entry.id});
		}

		choices.lastModifiedTimestamp = dateNow;
	}
	return choices.array;
}