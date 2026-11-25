import questieIcon from './assets/svg/projects/questie.svg?raw';
import gccuIcon from './assets/svg/projects/gccu.svg?raw';
import evriIcon from './assets/svg/projects/evrifuckingtime.svg?raw';
import worldMachineIcon from './assets/svg/projects/theworldmachine.svg?raw';
import avaliIcon from './assets/svg/projects/avali.svg?raw';
import argonIcon from './assets/svg/projects/argon.svg?raw';
import potassiumIcon from './assets/svg/projects/potassium.svg?raw';
import tracklissIcon from './assets/svg/projects/trackliss.svg?raw';

export type Project = {
	id: string;
	title: string;
	description: string;
	source?: string;
	visit?: string;
	icon: string;
};

export const projects: Project[] = [
	{
		id: 'questie',
		title: 'questie',
		description: 'a multitool for quest headsets',
		source: 'https://github.com/niko-tar-gz/questie',
		icon: questieIcon
	},
	{
		id: 'gccu',
		title: 'GCCU',
		description: 'gtag ccu tracker',
		source: 'https://github.com/niko-tar-gz/GCCU',
		visit: 'https://gccu.xenon.zone',
		icon: gccuIcon
	},
	{
		id: 'evrifuckingtime',
		title: 'evrifuckingtime',
		description: 'fuckass evri website',
		source: 'https://github.com/niko-tar-gz/evrifuckingtime',
		visit: 'https://evrifuckingtime.com',
		icon: evriIcon
	},
	{
		id: 'the-world-machine',
		title: 'the-world-machine',
		description: 'a (wip) mod to allow crossplay between versions of Gorilla Tag',
		source: 'https://github.com/niko-tar-gz/the-world-machine',
		icon: worldMachineIcon
	},
	{
		id: 'avali',
		title: 'avali',
		description: 'a no-bullshit media downloader',
		source: 'https://github.com/niko-tar-gz/avali',
		visit: 'https://avali.xenon.zone',
		icon: avaliIcon
	},
	{
		id: 'argon',
		title: 'Argon',
		description: 'A simple extensible menu for Gorilla Tag mods.',
		source: 'https://github.com/niko-tar-gz/Argon',
		icon: argonIcon
	},
	{
		id: 'potassium',
		title: 'Potassium',
		description: 'An optimisation mod for Gorilla Tag.',
		source: 'https://github.com/niko-tar-gz/Potassium',
		icon: potassiumIcon
	},
	{
		id: 'trackliss',
		title: 'trackliss',
		description: 'an app for music lovers',
		icon: tracklissIcon
	}
];
