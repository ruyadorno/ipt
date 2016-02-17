
# irm: Selects files to delete from current folder (recommended to use trash instead of rm -rf)
alias irm="ls | ipt -m -n | xargs rm -rf"

# irebase: Interactive build a list of git commits from log and rebase from selected one
alias irebase="git --no-pager log --oneline | ipt -n | cut -d ' ' -f 1 | xargs -o git rebase -i"
