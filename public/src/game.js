let GAMEDATA = {
    name: null,
    reward: null,
    cash: null,
    room: null,
    enemy: null,
    flash: null
};

window.onload = setPlayerName;

//////////////////////////////////////////////////////////////////////////////////////////////////////

class Card extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, number) {
        super(scene, x, y, `card${number}`);
        this.number = number;
        this.setScale(0.75);
        scene.add.existing(this);
    }

    setActive(number) {
        this.number = number;
        this.setTexture(`card${number}`);
        this.setAlpha(1);
    }

    setInactive() {
        this.number = 0;
        this.setAlpha(0.25);
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class HomeScene extends Phaser.Scene {
    constructor() {
        super('homescene');
    }

    preload() {
        this.load.image('title', '../assets/numberoli.png');
        this.load.image('join', '../assets/join.png');
        this.load.image('create', '../assets/create.png');
        this.load.image('footer', '../assets/footer.png')
    }

    create() {
        let self = this;

        let x = config.width / 2;
        let y = config.height / 2;

        this.add.image(x, 80, 'title');
        this.add.image(x, config.height - 40, 'footer');

        let roomName = `<input type="text" name="roomName" placeholder="Room Name"
                    style="width:256px; height: 32px; font-size: 20px; text-align: center;
                    color: white; background: #091c2b; border: 2px solid #059e9e">`;
        this.roomName = this.add.dom(x, y - 36).createFromHTML(roomName);

        if(GAMEDATA.flash) {
            this.add.text(x - 70, y - 6, GAMEDATA.flash, {fontSize: 12, color: '#fff000'});
            GAMEDATA.flash = null;
        }

        this.createRoom = this.add.image(x - 72, y + 36, 'create').setInteractive();

        this.joinRoom = this.add.image(x + 72, y + 36, 'join').setInteractive();

        this.createRoom.on('pointerdown', () => {
            let roomName = self.roomName.getChildByName('roomName').value.trim();
            if(roomName) {
                GAMEDATA.room = roomName;
                self.scene.start('gamescene');
            }
        });

        this.joinRoom.on('pointerdown', () => {
            let roomName = self.roomName.getChildByName('roomName').value.trim();
            if(roomName) {
                GAMEDATA.room = roomName;
                self.scene.start('gamescene');
            }
        });
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class GameScene extends Phaser.Scene {
    constructor() {
        super('gamescene')
    }

    preload() {
        this.load.image('card0', '../assets/0.png');
        this.load.image('card1', '../assets/1.png');
        this.load.image('card2', '../assets/2.png');
        this.load.image('card3', '../assets/3.png');
        this.load.image('card4', '../assets/4.png');
        this.load.image('card5', '../assets/5.png');
        this.load.image('card6', '../assets/6.png');
        this.load.image('card7', '../assets/7.png');
        this.load.image('card8', '../assets/8.png');
        this.load.image('card9', '../assets/9.png');
        this.load.image('card10', '../assets/10.png');
        this.load.image('card11', '../assets/11.png');
        this.load.image('card12', '../assets/12.png');
        this.load.image('card13', '../assets/unknown.png');
        this.load.image('rack', '../assets/rack.png');
        this.load.image('rackA', '../assets/rackActive.png');
        this.load.image('slotPanel', '../assets/slotPanel.png');

        this.load.audio('cardPlace', '../assets/cardPlace.wav');
        this.load.audio('endBell', '../assets/endBell.mp3');
    }

    create() {
        this.playerNums;
        this.playerTurn = false;

        let self = this;

        let opponentCardPointer = 0;

        this.playerSlot;
        this.opponentSlot;
        this.playerRack;
        this.opponentName = this.add.text((config.width - 340) / 2, 120, '▮ Waiting...', {fontFamily: 'Tahoma', color: '#87CEEB', fontSize: '12px'});
        this.playerDeck = this.add.group();
        this.opponentDeck = this.add.group();

        this.endBell = this.sound.add('endBell');
        this.cardPlace = this.sound.add('cardPlace');

        this.socket = io();

        this.socket.emit('join', {name: GAMEDATA.name, room: GAMEDATA.room});

        this.socket.on('disconnect', () => {
            GAMEDATA.flash = 'Oops!! Room is full.';
            this.scene.start('homescene');
        });

        showInterface(this);
        showSlots(this);
        showOpponentDeck(this);
        showPlayerDeck(this);

        this.input.setHitArea(this.playerDeck.getChildren()).on('gameobjectdown', (pointer, object) => {
            if(self.playerTurn && self.playerNums.includes(object.number)) {
                self.socket.emit('choice', object.number);
                self.playerTurn = false;
                self.playerRack.setTexture('rack');
            }
        });

        this.socket.on('deck', data => {
            let {deck, enemy} =  data;
            self.playerNums = deck;
            self.opponentName.setText(`▮ ${enemy}`);
            GAMEDATA.enemy = enemy;
            updatePlayerDeck(self, self.playerNums);
            self.socket.off('deck');
        });

        this.socket.on('end', cash => {
            GAMEDATA.reward = cash;
            GAMEDATA.cash += cash;
            localStorage.setItem('NPcash', GAMEDATA.cash);
            self.scene.start('endscene');
        })

        this.socket.on('playerChoice', number => {
            self.playerSlot.setTexture(`card${number}`).setAlpha(1);
            self.playerNums = self.playerNums.filter(num => num != number);
            let card = self.playerDeck.getChildren().filter(card => card.number == number)[0];
            card.setInactive();
            self.cardPlace.play();
        });

        this.socket.on('opponentChoice', number => {
            try{
                let card = self.opponentDeck.getChildren()[opponentCardPointer];
                card.setActive(number);
                opponentCardPointer += 1;
                self.opponentSlot.setTexture(`card${number}`).setAlpha(1);
                self.cardPlace.play();
            } catch {
            }
        });

        this.socket.on('turn', () => {
            self.playerTurn = true;
            self.playerRack.setTexture('rackA');
        });

        this.socket.on('reward', number => {
            self.opponentSlot.setAlpha(0.25);
            self.playerSlot.setAlpha(0.25);

            if(number == -1) {
                let card = self.opponentDeck.getChildren().filter(card => card.number != 13)[0];
                card.setActive(13);
            } else if(number > 0){
                self.playerNums.push(number);
                let card = self.playerDeck.getChildren().filter(card => card.number == 0)[0];
                card.setActive(number);
            }
        });
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class EndScene extends Phaser.Scene {
    constructor() {
        super('endscene');
    }

    preload() {
        console.log('end');
        this.load.image('won', '../assets/won.png');
        this.load.image('lost', '../assets/lost.png');
        this.load.image('title', '../assets/numberoli.png');
        this.load.image('footer', '../assets/footer.png');
    }

    create() {
        let x = config.width / 2;
        let y = config.height;

        this.add.image(x, 40, 'title');
        if(GAMEDATA.reward > 0) {
            this.add.image(x, y / 2, 'won');
        } else {
            this.add.image(x, y / 2, 'lost');
        }

        this.add.text(x - 10, y / 2 - 27, GAMEDATA.enemy, {
            fontSize: '14px', color: '#7869ac', fontStyle:'bold'});
        this.add.text(x - 20, y / 2 + 27, `${GAMEDATA.reward}`, {
            fontSize: '16px', color: '#f0874d', fontStyle:'bold'});
        this.add.text(x, y / 2 + 88, `${GAMEDATA.cash}`, {
            fontSize: '30px', color: '#b9d370', fontStyle:'bold'});

        this.add.image(x, y - 40, 'footer');
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

function setPlayerName() {
    let name = localStorage.getItem('NPname');
    if(!name) {
        while(!name) {
            name = window.prompt('Enter Player Name');
            if(name) {
                name = name.trim()
            }
        }
        localStorage.setItem('NPname', name);
        localStorage.setItem('NPcash', 60);
    }
    GAMEDATA.name = name;
    GAMEDATA.cash = +localStorage.getItem('NPcash');
}


function showInterface(scene) {
    x = config.width / 2;
    y = config.height;
    scene.playerRack = scene.add.image(x - 10, y - 80, 'rack');
    scene.add.image(x - 10, 70, 'rack');
    scene.add.image(x, y / 2, 'slotPanel').setScale(1.25);
}

function showSlots(scene) {
    let gap = (config.width - 138) / 2;
    let x = 32 + gap;
    let y = config.height / 2;
    scene.playerSlot = new Card(scene, x, y, 0);
    x += 64 + 10;
    scene.opponentSlot = new Card(scene, x, y, 0);
}

function showPlayerDeck(scene) {
    let gap = (config.width - 340) / 2;
    let x = 24 + gap;
    let y = config.height - 80;
    [1,2,3,4,5].forEach(() => {
        scene.playerDeck.add(new Card(scene, x, y, 13));
        x += 48 + 20 ;
    });
}

function updatePlayerDeck(scene, cardNumbers) {
    cardNumbers.forEach((number, index) => {
        let card = scene.playerDeck.getChildren()[index];
        card.number = number;
        card.setTexture(`card${number}`);
        card.setInteractive();
        x += 48 + 20 ;
    });
}

function showOpponentDeck(scene) {
    let gap = (config.width - 340) / 2;
    let x = 24 + gap;
    let y = 70;
    [1,2,3,4,5].forEach(() => {
        scene.opponentDeck.add(new Card(scene, x, y, 13));
        x += 48 + 20 ;
    });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth + 15,
    height: window.innerHeight,
    parent: 'gameDiv',
    backgroundColor: '#000000',
    dom: {
        createContainer: true
    },
    scene: [HomeScene, GameScene, EndScene]
}

const game = new Phaser.Game(config);