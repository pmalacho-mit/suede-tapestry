# devcontainers-template

This repository is intended to be used as a [GitHub template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template) for projects that rely on [Dev Containers](https://containers.dev/).

It includes the [devcontainers-suede](https://github.com/pmalacho-mit/devcontainers-suede) utility pre-installed so new repositories can quickly adopt a consistent, ready-to-use devcontainer setup.

By default, the [`devcontainers-suede/common.json`](./devcontainers-suede/common.json) devcontainer configuration is used.

If you want to refresh or change that configuration, run:

```bash
./devcontainers-suede/install.sh --force
```

## Upgrading

To get the latest devcontainer configurations from [devcontainers-suede](https://github.com/pmalacho-mit/devcontainers-suede), simply run `git subrepo pull devcontainers-suede` (assuming you have [git subrepo](https://github.com/ingydotnet/git-subrepo) installed, which will be if you use any of the provided devcontainer configs). 
