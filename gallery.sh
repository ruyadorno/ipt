
# irm: Selects files to delete from current folder (recommended to use trash instead of rm -rf)
alias irm="ls | ipt -m | xargs rm -rf"

# irebase: Interactive build a list of git commits from log and rebase from selected one
alias irebase="git --no-pager log --oneline | ipt | cut -d ' ' -f 1 | xargs -o git rebase -i"

# icheckout: Interactive git checkout a commit, similar to irebase
alias icheckout="git --no-pager log --oneline | ipt | cut -d ' ' -f 1 | xargs git checkout"

# iseek: Interactive browse folders, ctrl+c once you're done
function iseek() {
    cd "$(ls -a -d */ .. | ipt)"
    iseek
}

# iadd: Interactive staging of selected changed files (faster than git add --patch)
alias iadd='git status -s | sed s/^...// | ipt -m | xargs git add'
