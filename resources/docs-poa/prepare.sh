#!/bin/bash

function replaceTemplatePath() {
	local oldPath=$1
	local newPath="${oldPath/\$\{[a-zA-Z_]*\}/$2}"
	echo "Rename $oldPath with $newPath"
	if [ -d $oldPath ] ; then
		# echo " is folder"
		mv $oldPath $newPath
	elif [ -f $oldPath ]
	then
		# echo " is file"
		mv $oldPath $newPath
	fi
}

function replaceContentFiles() {
	echo "replace $1 with $2"
	find . -type f -exec sed -i -e "s/$1/$2/g" {} \;
	sleep 0.1;
}

#	Go to current directory
cd "$(dirname '$0')"

#	Display examples Docs variables 
echo "*** Prepare Docs with variables: ***"
echo "* Examples:"
echo "  - Name=<Your Name> (Ex: Miexs)"
echo "  - Name Chain=<Your Name Chain> | Default: \$Name Chain (Ex: Miexs Chain)"
echo "  - Name Coin=<Your Name Coin> | Default: \$Name Coin (Ex: Miexs Coin)"
echo "  - SYMBOL=<Your Symbol> (Ex: MIX)"
echo "  - TOKENSTANDARD=<Your Token Standard> | Default: \$SYMBOl (Ex: MIX ==> standards: (MIX20, MIX721, ...)"
echo "  - MainnetId=<Your Mainnet Id>"
echo "  - TestnetId=<Your Testnet Id>"
echo "  - domainchain=<Your domain> (Ex: miexs.com)"
echo "  - githubusername=<Your github user/organization name>"
echo "  - githubrepo=<Your repository name>"
echo "==="

if [ -f .env ]; then
	echo ""
	echo "Exists .env, getting variables from .env"
	set -a            
	source .env
	set +a
	echo ""
fi

#	Get values from DOCS envs
Name=$DOCS_NAME
Name_Chain=$DOCS_NAMECHAIN
Name_Coin=$DOCS_NAMECOIN
SYMBOL=$DOCS_SYMBOL
TOKENSTANDARD=$DOCS_TOKENSTANDARD
MainnetId=$DOCS_MAINNETID
TestnetId=$DOCS_TESTNETID
domainchain=$DOCS_DOMAINCHAIN
githubusername=$DOCS_GITHUBUSERNAME
githubrepo=$DOCS_GITHUBREPO

#	Input values (if need)
if [ -z $Name ]; then
	read -p "Enter 'Name': " Name
	if [ -z $Name ]; then
		echo "- Error: Missing Name"
		exit 1
	fi

	read -p "Enter 'Name Chain': " Name_Chain
	if [ -z $Name_Chain ]; then
		Name_Chain="$Name Chain"
	fi

	read -p "Enter 'Name Coin': " Name_Coin
	if [ -z $Name_Coin ]; then
		Name_Coin="$Name Coin"
	fi
else
	if [ -z $Name_Chain ]; then
		Name_Chain="$Name Chain"
	fi
	if [ -z $Name_Coin ]; then
		Name_Coin="$Name Coin"
	fi
fi

if [ -z $SYMBOL ]; then
	read -p "Enter 'SYMBOL': " SYMBOL
	if [ -z $SYMBOL ]; then
		echo "- Error: Missing SYMBOL"
		exit 1
	fi

	read -p "Enter 'TOKENSTANDARD': " TOKENSTANDARD
	if [ -z $TOKENSTANDARD ]; then
		TOKENSTANDARD=$SYMBOL
	fi
else
	if [ -z $TOKENSTANDARD ]; then
		TOKENSTANDARD=$SYMBOL
	fi
fi

if [ -z $MainnetId ]; then
	read -p "Enter 'MainnetId': " MainnetId
	if [ -z $MainnetId ]; then
		echo "- Error: Missing MainnetId"
		exit 1
	fi
fi

if [ -z $TestnetId ]; then
	read -p "Enter 'TestnetId': " TestnetId
	if [ -z $TestnetId ]; then
		echo "- Error: Missing TestnetId"
		exit 1
	fi
fi

if [ -z $domainchain ]; then
	read -p "Enter 'domainchain': " domainchain
	if [ -z $domainchain ]; then
		echo "- Error: Missing domainchain"
		exit 1
	fi
fi

if [ -z $githubusername ]; then
	read -p "Enter 'githubusername': " githubusername
	if [ -z $githubusername ]; then
		echo "- Error: Missing githubusername"
		exit 1
	fi
fi

if [ -z $githubrepo ]; then
	read -p "Enter 'githubrepo': " githubrepo
	if [ -z $githubrepo ]; then
		echo "- Error: Missing githubrepo"
		exit 1
	fi
fi

echo ""

#	Prepare datas
NAME=${Name^^}
name=${Name,,}
NameChain=${Name_Chain// /}
Name__Chain=${Name_Chain// /-}
name_chain=${Name_Chain,,}
name__chain=${name_chain// /-}
name___chain=${name_chain// /_}
SYMBOL=${SYMBOL^^}	#	prevent value not uppercase
symbol=${SYMBOL,,}
Symbol=$(printf %s ${symbol[@]^})
TOKENSTANDARD=${TOKENSTANDARD^^}	#	prevent value not uppercase
tokenstandard=${TOKENSTANDARD,,}
Tokenstandard=${tokenstandard[@]^}
HexMainnetId=0x$(printf "%x" $MainnetId)
HexTestnetId=0x$(printf "%x" $TestnetId)
domainchain=${domainchain,,}	#	prevent value not lowercase
Domainchain=$(printf %s ${domainchain[@]^})

echo "**Replacing with variables:**"
echo "  \${NAME} --> $NAME"
echo "  \${Name} --> $Name"
echo "  \${name} --> $name"
echo "  \${Name Chain} --> $Name_Chain"
echo "  \${Name-Chain} --> $Name__Chain"
echo "  \${name-chain} --> $name__chain"
echo "  \${NameChain} --> $NameChain"
echo "  \${name chain} --> $name_chain"
echo "  \${name_chain} --> $name___chain"
echo "  \${Name Coin} --> $Name_Coin"
echo "  \${SYMBOL} --> $SYMBOL"
echo "  \${Symbol} --> $Symbol"
echo "  \${symbol} --> $symbol"
echo "  \${TOKENSTANDARD} --> $TOKENSTANDARD"
echo "  \${Tokenstandard} --> $Tokenstandard"
echo "  \${tokenstandard} --> $tokenstandard"
echo "  \${MainnetId} --> $MainnetId"
echo "  \${HexMainnetId} --> $HexMainnetId"
echo "  \${TestnetId} --> $TestnetId"
echo "  \${HexTestnetId} --> $HexTestnetId"
echo "  \${githubusername} --> $githubusername"
echo "  \${githubrepo} --> $githubrepo"
echo "  \${Domainchain} --> $Domainchain"
echo "  \${domainchain} --> $domainchain"

read -p "Continue? (Y/N): " confirm && [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]] || exit 1
echo ""

if [[ ! -d docs-develop || ! -f docs-develop/index.md ]]; then
	cp -Ta docs docs-develop
fi

cd docs-develop

replaceTemplatePath faq/\${name} $name
replaceTemplatePath faq/$name/\${tokenstandard}.md $tokenstandard
replaceTemplatePath faq/$name/\${name}.md $name
replaceTemplatePath guides/concepts/\${name}-gov.md $name
replaceTemplatePath guides/concepts/\${TOKENSTANDARD}8.md $TOKENSTANDARD
replaceTemplatePath guides/concepts/\${TOKENSTANDARD}82.md $TOKENSTANDARD
replaceTemplatePath smart-chain/developer/\${name}-relayer.md $name
replaceTemplatePath smart-chain/developer/\${TOKENSTANDARD}20.md $TOKENSTANDARD
replaceTemplatePath smart-chain/developer/\${TOKENSTANDARD}721.md $TOKENSTANDARD
replaceTemplatePath smart-chain/developer/\${TOKENSTANDARD}20Token.template $TOKENSTANDARD
replaceTemplatePath smart-chain/developer/I\${TOKENSTANDARD}20.sol $TOKENSTANDARD
replaceTemplatePath smart-chain/developer/issue-\${TOKENSTANDARD}20.md $TOKENSTANDARD
replaceTemplatePath smart-chain/guides/\${name}-intro.md $name
replaceTemplatePath smart-chain/guides/\${symbol}-gas.md $symbol
replaceTemplatePath smart-chain/guides/concepts/\${name}-gov.md $name
replaceTemplatePath smart-chain/guides/concepts/\${name}-relayer.md $name
replaceTemplatePath smart-chain/guides/concepts/\${TOKENSTANDARD}86.md $TOKENSTANDARD
replaceTemplatePath smart-chain/guides/concepts/\${TOKENSTANDARD}89.md $TOKENSTANDARD
replaceTemplatePath smart-chain/wallet/\${name}.md $name

replaceContentFiles \${NAME} "$NAME"
replaceContentFiles \${Name} "$Name"
replaceContentFiles \${name} "$name"
replaceContentFiles "\${Name Chain}" "$Name_Chain"
replaceContentFiles "\${Name-Chain}" "$Name__Chain"
replaceContentFiles "\${NameChain}" "$NameChain"
replaceContentFiles "\${name chain}" "$name_chain"
replaceContentFiles "\${name-chain}" "$name__chain"
replaceContentFiles "\${name_chain}" "$name___chain"
replaceContentFiles "\${Name Coin}" "$Name_Coin"
replaceContentFiles \${SYMBOL} "$SYMBOL"
replaceContentFiles \${Symbol} "$Symbol"
replaceContentFiles \${symbol} "$symbol"
replaceContentFiles \${TOKENSTANDARD} "$TOKENSTANDARD"
replaceContentFiles \${Tokenstandard} "$Tokenstandard"
replaceContentFiles \${tokenstandard} "$tokenstandard"
replaceContentFiles \${MainnetId} "$MainnetId"
replaceContentFiles \${HexMainnetId} "$HexMainnetId"
replaceContentFiles \${TestnetId} "$TestnetId"
replaceContentFiles \${HexTestnetId} "$HexTestnetId"
replaceContentFiles \${githubusername} "$githubusername"
replaceContentFiles \${githubrepo} "$githubrepo"
replaceContentFiles \${Domainchain} "$Domainchain"
replaceContentFiles \${domainchain} "$domainchain"