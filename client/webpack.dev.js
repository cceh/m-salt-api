const merge  = require ('webpack-merge');
const common = require ('./webpack.common.js');

module.exports = merge (common, {
    devtool: 'eval-source-map',
    devServer: {
        contentBase: './src',  // so we don't have to copy files to dist
    },
});
