const path = require ('path');

module.exports = {
    entry : [
        './src/js/client.js',
        './src/index.html',    // hack to just copy these
        './src/api-list.json', // files from src to dist
    ],
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
                test: [
                    __dirname + '/src/index.html',
                    __dirname + '/src/api-list.json',
                ],
                use: [
                    'file-loader?name=[name].[ext]'
                ]
            },
            {
                test: /\.vue$/,
                use: [
                    'vue-loader'
                ]
            },
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
                test: /\.(png|jpg|jpeg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                use: [
                    'file-loader?name=webfonts/[name].[ext]'
                ]
            },
         ]
    },
    resolve: {
        modules: [
            path.resolve (__dirname, "src"),
            path.resolve (__dirname, "node_modules"),
        ],
        alias: {
            /* See: https://webpack.js.org/configuration/resolve/#resolve-alias */
            'vue$'           : path.resolve (__dirname, 'node_modules/vue/dist/vue.esm.js'),
            'client-css$'    : path.resolve (__dirname, 'src/css/client.scss'),
            'logo$'          : path.resolve (__dirname, 'src/images/cceh-logo.png'),
        }
    },
};
