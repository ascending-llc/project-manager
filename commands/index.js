import fs from "fs";
import inquirer from "inquirer";
import { homedir } from "os";
import shell from "shelljs"
import templates from "../config/templates.json" assert { type: "json" };
import json_data from "../config/json_data.json" assert { type: "json" };
import axios from "axios";
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt";
import { stringify } from "yaml";

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);

const add = (opts) => {
    if (!fs.existsSync(homedir() + "/.awspm")) {
        shell.echo("Please run pm config to set up configuration files");
        shell.exit();
    }
    if (!opts.template && !opts.file) {
        let data = fs.readFileSync(homedir() + "/.awspm/templates.json");
        let templates = JSON.parse(data);
        let cloud_templates = templates["templates"].filter(e => e.type === "cloud");

        inquirer.prompt([
            {
                type: "list",
                message: "Would you like to unpack this template in the current directory?",
                name: "is_unpacked",
                choices: [
                    "Yes",
                    "No"
                ]
            },
            {
                type: "list",
                message: "Which template would you like to add?",
                name: "template",
                choices: cloud_templates
            }
        ]).then(async e => {
            const { template, is_unpacked } = e;

            let cur_template = cloud_templates.find(e => e.name === template);

            if (cur_template.boilerplate) {

                // map questions to correct format
                const questions = await (cur_template.boilerplate.questions.map(async e => {
                    if (e.type.includes("file")) {
                        let data = JSON.parse(fs.readFileSync(`${homedir()}/.awspm/json_data.json`));
                        return {
                            type: "list",
                            message: e.title,
                            name: e.name,
                            choices: Object.keys(data)
                        }
                    }

                    // git types
                    if (e.type.includes("git")) {
                        let userdata = fs.readFileSync(homedir() + "/.awspm/userconfig.json");
                        let userconfig = JSON.parse(userdata);

                        shell.echo('Fetching git data');
                        let link;
                        // determine data type
                        // if (e.type.includes("repos")) {
                        link = `https://api.github.com/${userconfig.is_org === "Yes" ? `orgs/${userconfig.org}` : "user"}/repos`
                        // }
                        let res = await axios.get(link, {
                            headers: {
                                Accept: "application/vnd.github+json",
                                Authorization: "token " + userconfig.password
                            },
                            params: {
                                sort: "pushed"
                            }
                        });

                        return {
                            type: "list",
                            message: e.title,
                            name: e.name,
                            choices: res.data.map(e => e.name)
                        }
                    }

                    // basic types
                    return {
                        type: e.type,
                        message: e.title,
                        name: e.name,
                    }
                }))

                let question_res = await Promise.all(questions);
                inquirer.prompt(question_res).then(a => {
                    const keys = Object.keys(a);

                    shell.echo("Cloning template");
                    let git_name = (cur_template.link.split("/")[4]).split(".")[0];
                    shell.exec(`git clone ${cur_template.link} -q`)
                    shell.exec(`rm -rf ${git_name}/.git`);

                    shell.echo("Changing boilerplate");
                    const switch_out = cur_template.boilerplate.variables;
                    const files = {};

                    // update boilerplate code internally
                    for (const key of keys) {
                        const prompt = cur_template.boilerplate.questions.find(e => e.name === key);

                        // get array of lines
                        let file;
                        if (files[prompt.file]) {
                            file = files[prompt.file];
                        } else {
                            let res = fs.readFileSync(`${git_name}/${prompt.file}`, "utf-8");
                            file = res.split(/\r?\n/);
                            files[prompt.file] = file
                        }

                        // get lines to swap out code
                        let lines = typeof prompt.line === "string" ? prompt.line.split(",") : [prompt.line];

                        // replace strings with new boilerplate
                        for (const line of lines) {
                            let cur_line = file[line - 1];
                            let data;

                            if (prompt.type.includes("file")) {
                                let json_data = JSON.parse(fs.readFileSync(`${homedir()}/.awspm/json_data.json`));

                                if (prompt.type === "file>yaml") {
                                    // dont forget to reproduce indentation!!
                                    let indentation = cur_line.replace(switch_out, "");
                                    let res = stringify(json_data[a[key]]);
                                    data = res.replaceAll("\n", `\n${indentation}`);
                                } else {
                                    data = json_data[a[key]]
                                }

                            } else {
                                data = a[key];
                            }

                            cur_line = cur_line.replace(switch_out, data);

                            file[line - 1] = cur_line;
                        }
                    }

                    // write data to files
                    for (const key in files) {
                        let file = files[key];

                        let data = file.join("\n")

                        fs.writeFileSync(`${git_name}/${key}`, data)
                    }

                    shell.echo("Imported new boilerplate code");

                    if (is_unpacked === "Yes") shell.exec(`mv ${git_name}/* ./`)
                }).catch(e => console.log(e));
            } else {
                let link = cloud_templates.find(e => e.name === template).link;
                let git_name = (link.split("/")[4]).split(".")[0];
                shell.echo(`Cloning template into ${is_unpacked === "Yes" ? "current directory" : git_name}...`);
                shell.exec(`git clone ${link} -q`);
                if (is_unpacked === "Yes") shell.exec(`mv cft/* ./`)
                shell.exec(`rm -rf ${git_name}/.git`);
                shell.exit();
            }
        }).catch(e => console.log(e));
    } else if (opts.template && !opts.file) {
        inquirer.prompt([
            {
                type: "list",
                message: "What is the type of the template?",
                name: "type",
                choices: [
                    "Git Clone",
                    "Git Template",
                    "Git Boilerplate"
                ],
            },
            {
                type: "input",
                message: "What is the name of the template",
                name: "name",
            },
            {
                type: "input",
                message: "What is the git clone link for this template",
                name: "link",
                when: (e) => e.type === "Git Clone" || e.type === "Git Boilerplate"
            },
            {
                type: "input",
                message: "Who is the owner of the template repo?",
                name: "owner",
                when: (e) => e.type === "Git Template"
            },
            {
                type: "input",
                message: "What is the repo name?",
                name: "repo",
                when: (e) => e.type === "Git Template"
            },
            {
                type: "file-tree-selection",
                message: "Where is the JSON file for the boilerplate?",
                name: "file",
                when: (e) => e.type === "Git Boilerplate"
            }
        ]).then(element => {
            const { type, name, file } = element
            fs.readFile(homedir() + "/.awspm/templates.json", (e, d) => {
                if (e) {
                    console.log(e)
                } else {
                    let data = JSON.parse(d);
                    let link = type === "Git Template" ? `https://api.github.com/repos/${element.owner}/${element.repo}/generate` : element.link
                    let new_data;
                    if (file) {
                        let questions_data = JSON.parse(fs.readFileSync(file));
                        new_data = {
                            type: type === "Git Template" ? "code" : "cloud",
                            name,
                            link,
                            boilerplate: questions_data
                        }
                    } else {
                        new_data = {
                            type: type === "Git Template" ? "code" : "cloud",
                            name,
                            link
                        }
                    }
                    data["templates"].push(new_data);
                    fs.writeFileSync(homedir() + "/.awspm/templates.json", JSON.stringify(data));
                    shell.echo("Successfully pushed " + element.name + " to templates");
                }
            })
        }).catch(e => console.log(e))
    } else if (opts.file && !opts.template) {
        inquirer.prompt([
            {
                type: "file-tree-selection",
                name: "file",
                message: "Please select the json data to import"
            },
            {
                type: "input",
                name: "name",
                message: "What is the name of this json data?"
            }
        ]).then(e => {
            let json_res = fs.readFileSync(homedir() + "/.awspm/json_data.json");
            let data_res = fs.readFileSync(e.file);
            let json_data = JSON.parse(json_res);
            let data = JSON.parse(data_res);
            json_data[e.name] = data;
            fs.writeFileSync(`${homedir()}/.awspm/json_data.json`, JSON.stringify(json_data));
        }).catch(e => console.log(e))
    } else {
        shell.echo("[ERROR] Found two options...")
    }

}

const config = async (opts) => {
    if (opts.profile) {
        let data = JSON.parse(fs.readFileSync(`${homedir()}/.awspm/userconfig.json`));
        if (data.profiles) {
            inquirer.prompt([
                {
                    type: "list",
                    message: "Which profile would you like to use?",
                    name: "profile_name",
                    choices: Object.keys(data.profiles)
                }
            ]).then(e => {
                const { profile_name } = e;
                const profile = data.profiles[profile_name];

                data.profiles[data.profile] = {
                    password: data.password,
                    is_org: data.is_org,
                    org: data.org,
                    profile: data.profile
                }

                data.password = profile.password;
                data.is_org = profile.is_org;
                data.org = profile.org;
                data.profile = profile.profile;

                fs.writeFileSync(`${homedir()}/.awspm/userconfig.json`, JSON.stringify(data));
                shell.echo(`Switched profile to ${profile_name}`);
            }).catch(e => console.log(e));
        } else {
            shell.echo("Must have at least one extra profile.");
        }
    } else if (opts.repo) {
        if (!fs.existsSync(homedir() + "/.awspm")) {
            shell.echo("Please run pm config to set up configuration files");
            shell.exit();
        }
        let userdata = fs.readFileSync(homedir() + "/.awspm/userconfig.json");
        let userconfig = JSON.parse(userdata);

        shell.echo('Fetching repos');
        let repo_link = `https://api.github.com/${userconfig.is_org === "Yes" ? `orgs/${userconfig.org}` : "user"}/repos`
        let res = await axios.get(repo_link, {
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: "token " + userconfig.password
            },
            params: {
                sort: "pushed"
            }
        })
        let names = res.data.map(e => e.name);
        inquirer.prompt([
            {
                type: "list",
                name: "repo",
                choices: [...names],
                message: "Which repo would you like to add a config file for?"
            },
            {
                message: "What commands would you like to add? (Seperate commands by a semicolon ;)",
                name: "commands",
                type: "input"
            }
        ]).then(e => {
            try {
                const { repo, commands } = e;
                let cmds = commands.split(";");
                let data;
                if (fs.existsSync(homedir() + "/.awspm/commands.json")) {
                    res = JSON.parse(fs.readFileSync(`${homedir()}/.awspm/commands.json`));
                    let flag;
                    res.forEach((e, i) => {
                        if (e.repo === repo) flag = i
                    });
                    if (flag) {
                        data = [...res];
                        data[flag] = { repo, cmds }
                    } else {
                        data = [...res, { repo, cmds }]
                    }
                } else {
                    data = [
                        {
                            repo,
                            cmds
                        }
                    ]
                }
                fs.writeFileSync(`${homedir()}/.awspm/commands.json`, JSON.stringify(data));
                shell.echo("Successfully imported commands")
            } catch (error) {
                shell.echo("Unexpected error!")
                shell.echo(error)
            }
        }).catch(e => console.log(e))
    } else {
        shell.echo("The GitHub token must have Repo access as well as Hook access");
        inquirer.prompt([
            {
                type: "password",
                message: "Please enter your token",
                name: "password",
                mask: "*"
            },
            {
                type: "list",
                message: "Are you working under an organization?",
                name: "is_org",
                choices: [
                    "Yes",
                    "No"
                ]
            },
            {
                type: "input",
                message: "What is name of the GitHub Org",
                name: "org",
                when: (e) => e.is_org === "Yes"
            },
            {
                type: "input",
                message: "What is the name of this profile?",
                name: "profile"
            }
        ]).then(e => {
            if (opts.add) {
                const { profile } = e;
                let data = JSON.parse(fs.readFileSync(`${homedir()}/.awspm/userconfig.json`));
                if (data.profiles) {
                    data["profiles"][`${profile}`] = e;
                } else {
                    data.profiles = {};
                    data.profiles[`${profile}`] = e;
                }
                fs.writeFileSync(`${homedir()}/.awspm/userconfig.json`, JSON.stringify(data));
                shell.echo(`Profile: ${profile} imported to userconfig`);
            } else {
                if (!fs.existsSync(homedir() + "/.awspm") || opts.reset) {
                    if (opts.reset) {
                        fs.rmdirSync(`${homedir()}/.awspm`, { recursive: true, force: true });
                    }
                    fs.mkdirSync(homedir() + "/.awspm");
                    fs.writeFileSync(homedir() + "/.awspm/userconfig.json", JSON.stringify(e))
                    fs.writeFileSync(homedir() + "/.awspm/templates.json", JSON.stringify(templates))
                    fs.writeFileSync(homedir() + "/.awspm/json_data.json", JSON.stringify(json_data))
                    shell.echo("Successfully imported Config Files")
                } else {
                    fs.writeFileSync(homedir() + "/.awspm/userconfig.json", JSON.stringify(e))
                    shell.echo("Successfully updated User Config")
                }
            }
        })
    }
}

const init = async (opts) => {
    if (opts.depth && opts.depth >= 1) {
        for (let i = 0; i < opts.depth; i++) {
            shell.exec(`mkdir depth-${i}`)
            shell.cd(`depth-${i}`)
        }
    } else if (opts.depth) {
        shell.echo("Depth option must be at least 1")
        shell.exit(1);
    }
    try {
        if (!fs.existsSync(homedir() + "/.awspm")) {
            shell.echo("Please run pm config to set up configuration files");
            shell.exit();
        }
        shell.echo(`Deleting old files`)
        shell.exec("find . -delete")

        let data = fs.readFileSync(homedir() + "/.awspm/templates.json");
        let templates = JSON.parse(data);
        let cloud_templates = templates["templates"].filter(e => e.type === "cloud");
        let code_templates = templates["templates"].filter(e => e.type === "code");
        let userdata = fs.readFileSync(homedir() + "/.awspm/userconfig.json");
        let userconfig = JSON.parse(userdata);

        shell.echo('Fetching repos');
        let repo_link = `https://api.github.com/${userconfig.is_org === "Yes" ? `orgs/${userconfig.org}` : "user"}/repos`
        let res = await axios.get(repo_link, {
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: "token " + userconfig.password
            },
            params: {
                sort: "pushed"
            }
        })

        let names = res.data.map(e => e.name);
        inquirer.prompt([
            {
                type: "list",
                choices: [
                    "New",
                    "Existing"
                ],
                name: "choice1",
                message: "Is this project a new or existing project"
            },
            {
                type: "checkbox",
                choices: [
                    "None",
                    ...cloud_templates.map(e => e.name)
                ],
                message: "Would you like any Git boilerplate?",
                name: "cloud_templates",
                when: (e) => e.choice1 === "New"
            },
            {
                type: "list",
                choices: [
                    "Empty",
                    ...code_templates.map(e => e.name)
                ],
                message: "What Git template would you like?",
                name: "code_template",
                when: (e) => e.choice1 === "New"
            },
            {
                type: "list",
                choices: [...names],
                message: "Please choose which repo you're working on...",
                name: "repo",
                when: (e) => e.choice1 === "Existing"
            },
            {
                type: "input",
                message: "What is the name of the new Project?",
                name: "name",
                when: (e) => e.choice1 === "New"
            },
            {
                type: "list",
                message: "Is the project private or public?",
                choices: [
                    "Private",
                    "Public"
                ],
                name: "is_private",
                when: (e) => e.choice1 === "New"
            },
            {
                type: "input",
                message: "Basic description of the new app",
                name: "desc",
                when: (e) => e.choice1 === "New"
            },
        ]).then(async e => {
            if (e.choice1 === "New") {
                try {
                    let post = e.code_template === "Empty" ? "Empty" : code_templates.find(d => d.name === e.code_template).link;
                    let data = {
                        "name": e.name,
                        "description": e.desc,
                        "private": e.is_private === "Private"
                    };
                    if (e.code_template === "Empty") {
                        post = userconfig.is_org === "Yes" ? "https://api.github.com/orgs/" + userconfig.org + "/repos" : "https://api.github.com/user/repos";
                    } else {
                        if (userconfig.is_org === "Yes") data["owner"] = userconfig.org;
                    }
                    let res = await axios.post(post, data, {
                        headers: {
                            Accept: "application/vnd.github+json",
                            Authorization: "token " + userconfig.password
                        }
                    })
                    let repo_url = res.data.clone_url;
    
                    shell.echo("Creating and cloning repo...")
    
                    shell.exec("sleep 3")
    
                    shell.exec(`git clone ${repo_url} . -q`)
    
                    if (e.cloud_templates[0] !== "None") {
                        for (const template in e.cloud_templates) {
                            let template_name = e.cloud_templates[template];
                            let cur_template = cloud_templates.find(e => e.name === template_name);
    
                            shell.echo(`Cloning ${template}`);
    
                            shell.exec(`git clone ${cur_template.link} . -s`)
                        }
                    }   
                } catch (error) {
                    shell.echo("Encountered error while running command");
                    shell.echo(`Error ${error}`)
                }
            } else {
                let repo = res.data.find(repo => repo.name === e.repo);
                let branches_url = repo.branches_url.split("{")[0]
                console.log(branches_url);
                shell.echo("Fetching branches")
                try {
                    let data = await axios.get(branches_url, {
                        headers: {
                            Accept: "application/vnd.github+json",
                            Authorization: "token " + userconfig.password
                        }
                    });
                    let name_map = data.data.map(e => e.name);

                    inquirer.prompt([
                        {
                            type: "list",
                            message: "Please choose a branch",
                            choices: name_map,
                            name: "branch"
                        }
                    ]).then(({ branch }) => {
                        let clone_url = res.data.filter(repo => repo.name === e.repo)[0].clone_url;
                        shell.exec(`git clone ${clone_url} . -q`);
                        shell.exec(`git checkout ${branch}`)
                        if (fs.existsSync(`${homedir()}/.awspm/commands.json`)) {
                            let cmds = JSON.parse(fs.readFileSync(`${homedir()}/.awspm/commands.json`));
                            cmds.forEach(element => {
                                if (element.repo === e.repo) {
                                    shell.echo(`Executing commands for ${e.repo}`)
                                    element.cmds.forEach(cmd => {
                                        try {
                                            shell.exec(cmd);
                                        } catch (error) {
                                            shell.echo(`Error executing ${cmd}`)
                                            shell.echo(error)
                                        }
                                    });
                                }
                            });
                        }
                    })
                } catch (error) {
                    console.log(error)
                }
            }
        })
    } catch (error) {
        console.log(error);
    }
}

const git = async () => {
    let status = shell.exec("git status -s")["stdout"];
    let remote_url = shell.exec("git config --get remote.origin.url", { silent: true })["stdout"];
    let repo = remote_url.split("/")[remote_url.split("/").length - 1].split(".")[0]
    let status_list = status.split(/\r?\n|\r|\n/g)
    status_list.pop()
    inquirer.prompt([
        {
            type: "confirm",
            message: `Would you like to these push changes to remote repo ${repo}?`,
            name: 'confirm_status'
        },
        {
            type: "checkbox",
            message: "Which changes would you like to commit?",
            name: "changes",
            choices: status_list,
            when: (e) => e.confirm_status === false
        },
        {
            type: "input",
            message: "What's the commit message?",
            name: "commit_message"
        },
    ]).then(e => {
        const { confirm_status, commit_message } = e;
        if (confirm_status) {
            shell.exec(`git commit -a -m "${commit_message}"`);
            shell.exit();
        }
        const { changes } = e;
        for (const change of changes) {
            let file = change.slice(2)
            shell.exec(`git add ${file}`)
        }
        shell.exec(`git commit -m "${commit_message}"`)
    });
}

export default {
    add,
    config,
    init,
    git
}