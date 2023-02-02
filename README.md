# Numberoli

Online-Multiplayer card game built using [phaser3.js](https://phaser.io/phaser3), node.js, express.js and socket.io

Play it here: [Numberoli](https://numberoli.onrender.com/)

![Screenshot](https://github.com/mochatek/Numberoli/blob/master/screenshot.png?raw=true)

## Game Instructions

- Create __room__ and invite friend to play against.

- Each __deck__ is composed of __12 cards__ with values ranging from __1 to 12__.

- Both players will be handed __5 random cards__ from their respective deck at the beginning of the game.

- Both players will take __turns__ to play __one card__ in each round, with the very __first turn__ chosen at __random__.

- After each round, the player who played the __bigger card__ will receive a __point card__ amounting to the __difference__ in value between cards played in that round, provided the player __doesn't have that card already__.

- The player who played the card with __smaller__ value will take the __first turn__ in the __next round__.

- The game continues until either player has __no cards left__ to play, and the other player with cards left is declared the __WINNER !__

- We can also do __live chats__ and __emotes__ while playing.

- You need __₹.12__ to play the game. If you loose, you loose all 12. If you win, you get __₹.(12 + sum of remaining cards)__.

## Installation

Download and Install [Node.js](https://nodejs.org/en/download/)

Use [npm]() to install the dependencies.

```
npm install
```

## How to Run

Run any of the following commands to start the application.

`npm start` or `node server.js`

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://github.com/mochatek/Numberoli/blob/master/LICENSE)
