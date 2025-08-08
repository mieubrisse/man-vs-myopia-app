set -euo pipefail
script_dirpath="$(cd "$(dirname "${0}")" && pwd)"

secret_filepath=/tmp/man-vs-myopia-app-token
op read "op://njr5tpkb6fbk6zgznwp5n2kb5y/m7idcfhrbople3n72i4u4j4xa4/notesPlain" > "${secret_filepath}"

"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "${script_dirpath}"
