#!/bin/bash

# Downloads the open-sans ttf bundle and generates the webfonts.
#
# prerequisites:
#   sudo apt-get install fontforge ttfautohint lcdf-typetools woff2
#

FONTDIR=../client/src/webfonts
CSS=../client/src/css/siddhanta.css
BASEURL=../webfonts/
DATE=`date`
WOFF2_COMPRESS=woff2_compress

cat > $CSS <<EOF
/*
Generated by M-SALT scripts/get-fonts.sh on $DATE

url('font.eot');                                     IE9 Compat Modes
url('font.eot?#iefix')  format('embedded-opentype'), IE6-8
url('font.woff2')       format('woff2'),             Firefox 39+, Chrome 36+
url('font.woff')        format('woff'),              Modern Browsers
url('font.ttf')         format('truetype'),          Safari 3.1+, Android 2.2+, Safari iOS 4.3+
url('font.svg#svgname') format('svg');               Safari iOS 3.2+

See also: http://blog.fontspring.com/2011/02/further-hardening-of-the-bulletproof-syntax/
*/

EOF


for TTF in $FONTDIR/siddhanta.ttf
do
    ./convert.pe "$TTF"                  # fontforge shell file
    ttfautohint "$TTF" "$TTF.autohint"
    mv "$TTF.autohint" "$TTF"
    $WOFF2_COMPRESS "$TTF"

    PSNAME=`otfinfo -p "$TTF"`
    URL="$BASEURL"`basename -s .ttf "$TTF"`

    cat >> $CSS <<EOF
@font-face {
    font-family: '$PSNAME';
    src: url('$URL.eot');
    src: url('$URL.eot?#iefix') format('embedded-opentype'),
         url('$URL.woff2')      format('woff2'),
         url('$URL.woff')       format('woff'),
         url('$URL.ttf')        format('truetype'),
         url('$URL.svg#$PSNAME') format('svg');
    font-weight: normal;
    font-style: normal;
}

EOF
done
