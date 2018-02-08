# Agx
A 200 day moving average for the price of steem/sbd

# Prerequisite for development

`sudo apt-get install imagemagick librsvg2-dev librsvg2-bin` on Linux or
`brew install imagemagick librsvg librsvg2-bin` on Mac

# Getting Started

Set your environment variables with your steem userid and your posting Wif key:

`export AUTHOR=aggroed`
`export WIF=5---------------------M`

Get the code and start the web server:

`git clone git@github.com:aggroed/Agx.git`
`cd Agx`
`npm install`
`npm start`

Access the www server with `http://localhost:3000`

# To do

* Write mocha tests
