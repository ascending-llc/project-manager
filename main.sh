function select_option {

    # little helpers for terminal print control and key input
    names=$1

    ESC=$(printf "\033")
    cursor_blink_on() { printf "$ESC[?25h"; }
    cursor_blink_off() { printf "$ESC[?25l"; }
    cursor_to() { printf "$ESC[$1;${2:-1}H"; }
    print_option() { printf "   $1 "; }
    print_selected() { printf "  $ESC[7m $1 $ESC[27m"; }
    get_cursor_row() {
        IFS=';' read -sdR -p $'\E[6n' ROW COL
        echo ${ROW#*[}
    }
    search() {
        flag=0
        for i in ${!names[@]}; do
            current_name="${names[$i]}"
            if [[ $current_name == "$1"* ]]; then
                if [[ ${names[$selected]} == "$1"* ]]; then
                    if [ $i -lt $selected ]; then
                        continue
                    elif [[ $i == $selected ]]; then
                        continue
                    else
                        flag=$i
                        break
                    fi
                else
                    flag=$i
                    break
                fi
            fi
        done
        if [ $flag -gt 0 ]; then
            selected=$flag
        else
            for i in ${!names[@]}; do
                current_name="${names[$i]}"
                if [[ $current_name == "$1"* ]]; then
                    selected=$i
                    break
                fi
            done
        fi
    }

    # initially print empty new lines (scroll down if at bottom of screen)
    for opt; do printf "\n"; done

    # determine current screen position for overwriting the options
    local lastrow=$(get_cursor_row)
    local startrow=$(($lastrow - $#))

    # ensure cursor and input echoing back on upon a ctrl+c during read -s
    trap "cursor_blink_on; stty echo; printf '\n'; exit" 2
    cursor_blink_off

    selected=0
    while true; do
        # print options by overwriting the last lines
        local idx=0
        for opt; do
            cursor_to $(($startrow + $idx))
            if [ $idx -eq $selected ]; then
                print_selected "$opt"
            else
                print_option "$opt"
            fi
            ((idx++))
        done

        read -r -s -n1 key
        if [[ $key == $ESC ]]; then
            read -r -s -n2 key
        fi
        case $key in
        '[A'*)
            ((selected--))
            if [ $selected -lt 0 ]; then selected=$(($# - 1)); fi
            ;;
        '[B'*)
            ((selected++))
            if [ $selected -ge $# ]; then selected=0; fi
            ;;
        '') break ;;
        *) search "$key" ;;
        esac

    done

    # cursor position back to normal
    cursor_to $lastrow
    printf "\n"
    cursor_blink_on

    return $selected
}

# find . -not -name 'cleanup.sh' -delete
echo 'New or old project?'
options=("New" "Old")
select_option ${options[@]}
option_i=$?
option=${options[$option_i]}


if [ "$option" == "New" ]; then
    echo "Please choose a name for the repo: "
    read -r repoName

    echo "Would you like a standard cloudformation template?"
    yn_options=("Yes" "No")
    select_option ${yn_options[@]}
    yn_i=$?
    yn=${yn_options[$yn_i]}

    if [ "$yn" == "Yes" ]; then
        cloudformation=yes
    else
        cloudformation=no
    fi

    echo 'Please choose a project type: '
    projectOptions=("SAM" "React" "Empty")
    select_option ${projectOptions[@]}
    project_i=$?
    project=${projectOptions[$project_i]}

    if [ "$project" == "SAM" ]; then
        echo 'Creating a new SAM project...'

        repoUrl=$(curl -s -X POST https://api.github.com/repos/NathanCFoster/python-sam/generate -H "Accept: application/vnd.github+json" -H "Authorization: token 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" -d '{"owner":"ascending-llc","name":"'"$repoName"'","description":"Repository created by the custom sh CLEANUP script","include_all_branches":false,"private":false}' | json clone_url)

        sleep 5

        git clone $repoUrl . -q
    elif [ "$project" == "React" ]; then
        echo 'Creating a new React project...'

        repoUrl=$(curl -s -X POST https://api.github.com/repos/NathanCFoster/react-app/generate -H "Accept: application/vnd.github+json" -H "Authorization: token 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" -d '{"owner":"ascending-llc","name":"'"$repoName"'","description":"Repository created by the custom sh CLEANUP script","include_all_branches":false,"private":false}' | json clone_url)

        sleep 5

        git clone $repoUrl . -q
    else
        echo 'Creating a new Git repo'

        repoUrl=$(curl -s -X POST https://api.github.com/user/repos -H "Accept: application/vnd.github+json" -H "Authorization: token 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" -d '{"name":"'"$repoName"'","description":"Repository created by the custom sh CLEANUP script","private":false}' | json clone_url)

        sleep 5

        git clone $repoUrl . -q
    fi

    if [ $cloudformation == 'yes' ]; then
        echo 'Creating basic Cloudformation templates...'

        git clone --depth=1 https://github.com/NathanCFoster/cft.git cft -q
        rm -rf ./cft/.git
    fi
else
    echo "Loading repos..."

    arr=$(curl -s -H "Accept: application/vnd.github+json" -H "Authorization: token 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" https://api.github.com/orgs/ascending-llc/repos?sort=pushed | json -a name)
    names=()

    for arr in $arr; do
        names+=("$arr")
    done
    select_option ${names[@]}
    i=$?
    choice=${names[$i]}

    echo "Cloning $choice..."

    git clone https://github.com/ascending-llc/$choice.git . -q
fi

echo 'All cleaned up'
