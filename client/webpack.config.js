const path = require ('path');

module.exports = {
    entry : './src/js/client.js',
    devtool: 'eval-source-map',
    devServer: {
        contentBase: './dist'
    },
    output : {
        filename: 'bundle.js',
        path: path.resolve (__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
         ]
    },
    resolve: {
        modules: [path.resolve (__dirname, "src"), "node_modules"],
        alias: {
            /* See: https://webpack.js.org/configuration/resolve/#resolve-alias */
            'vue$'           : path.resolve (__dirname, 'node_modules/vue/dist/vue.esm.js'),
            'client-css$'    : path.resolve (__dirname, 'src/css/client.scss'),
            'logo$'          : path.resolve (__dirname, 'src/images/cceh-logo.png'),
        }
    },
};
