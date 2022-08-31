# AWS Project Manager

Project manager enabling users to keep data clean and organized, ensuring only one directory for code is needed.

## Usage

### **Installation**

```bash
npm i awspm -g
```

### or in newer npm versions

```bash
npm i awspm --location=global
```

### **Configuration**

> Getting a GitHub token

Go to [this website](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and follow the steps to create a token. Make sure:
- Your token has Full access to repos
- Your token has Admin access to repo hooks
- You have copied the token

> CLI

Run below command and follow the steps:

```bash
pm config
```

\* Please understand if you choose to be in an org any new project will be under that org.

### **Adding Templates**

> Current project

```bash
pm add
```

> Config file

```bash
pm add -t
```

### **Using the CLI**

Run below command to either start a new repo or change repos to an existing one.

```bash
pm i
```

\* Running above command will delete all files in current directory 