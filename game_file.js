var io;
var gameSocket;
var db;
exports.initGame = function(sio, socket,sdb){
    io = sio;
    gameSocket = socket;
    db=sdb;
    gameSocket.emit('connected', { message: "You are connected!" });

    gameSocket.on('findLeader',findLeader);

    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);

    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerRestart', playerRestart);
}

function hostCreateNewGame() {
  
    var thisGameId = ( Math.random() * 100000 ) | 0;

    
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    
    this.join(thisGameId.toString());
};


function hostPrepareGame(gameId) {
    var sock = this;
    var data = {
        mySocketId : sock.id,
        gameId : gameId
    };
    
    io.sockets.in(data.gameId).emit('beginNewGame', data);
}


function hostStartGame(gameId) {
    console.log('Game Started.');
    sendWord(0,gameId);
};


function hostNextRound(data) {
    if(data.round < wordPool.length ){
       
        sendWord(data.round, data.gameId);
    } else {

      if(!data.done)
      {
      
        db.all("SELECT * FROM player WHERE player_name=?",data.winner, function(err, rows) {
        rows.forEach(function (row) {
            win=row.player_win;
            win++;
            console.log(win);
            db.run("UPDATE player SET player_win = ? WHERE player_name = ?", win, data.winner);
            console.log(row.player_name, row.player_win);
        })
        });
        data.done++;
      }
      
      io.sockets.in(data.gameId).emit('gameOver',data);
    }
}

function findLeader()
{
  console.log("finding leader");
    var sock=this;
    var i=0;
    leader={};
    db.all("SELECT * FROM player ORDER BY player_win DESC LIMIT 10",function(err,rows)
    {
      if(rows!=undefined)
      {
        rows.forEach(function (row)
        {
          leader[i]={};
          leader[i]['name']=row.player_name;
          leader[i]['win']=row.player_win;
          console.log(row.player_name);
          console.log(row.player_win);
          i++;
        })
      }
      console.log("found leader");
      sock.emit('showLeader',leader);
    });

}

function playerJoinGame(data) {
    
    var sock = this;

    
    var room = gameSocket.manager.rooms["/" + data.gameId];

    
    if( room != undefined ){
       
        data.mySocketId = sock.id;

        sock.join(data.gameId);
        db.serialize(function()
            {
                var stmt = " SELECT * FROM player WHERE player_name='"+data.playerName+"';";
                db.get(stmt, function(err, row){
                    if(err) throw err;
                    if(typeof row == "undefined") {
                            db.prepare("INSERT INTO player (player_name,player_win) VALUES(?,?)").run(data.playerName,0).finalize();
                    } else {
                        console.log("row is: ", row);
                    }
                });
            });
        
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
       
        this.emit('error',{message: "This room does not exist."} );
    }
}


function playerAnswer(data) {
    
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}


function playerRestart(data) {
    
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
}

function sendWord(wordPoolIndex, gameId) {
    var data = getWordData(wordPoolIndex);
    io.sockets.in(data.gameId).emit('newWordData', data);
}


function getWordData(i){
   
    var words = shuffle(wordPool[i].words);

   
    var decoys = shuffle(wordPool[i].decoys).slice(0,5);

    
    var rnd = Math.floor(Math.random() * 5);
    decoys.splice(rnd, 0, words[1]);

   
    var wordData = {
        round: i,
        word : words[0],   
        answer : words[1], 
        list : decoys      
    };

    return wordData;
}


function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    
    while (0 !== currentIndex) {

       
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

var wordPool = [
    {
        "words"  : [ "sale","seal","ales","leas" ],
        "decoys" : [ "lead","lamp","seed","eels","lean","cels","lyse","sloe","tels","self" ]
    },

    {
        "words"  : [ "item","time","mite","emit" ],
        "decoys" : [ "neat","team","omit","tame","mate","idem","mile","lime","tire","exit" ]
    },

    {
        "words"  : [ "spat","past","pats","taps" ],
        "decoys" : [ "pots","laps","step","lets","pint","atop","tapa","rapt","swap","yaps" ]
    },

    {
        "words"  : [ "nest","sent","nets","tens" ],
        "decoys" : [ "tend","went","lent","teen","neat","ante","tone","newt","vent","elan" ]
    },

    {
        "words"  : [ "pale","leap","plea","peal" ],
        "decoys" : [ "sale","pail","play","lips","slip","pile","pleb","pled","help","lope" ]
    },

    {
        "words"  : [ "races","cares","scare","acres" ],
        "decoys" : [ "crass","scary","seeds","score","screw","cager","clear","recap","trace","cadre" ]
    },

    {
        "words"  : [ "bowel","elbow","below","beowl" ],
        "decoys" : [ "bowed","bower","robed","probe","roble","bowls","blows","brawl","bylaw","ebola" ]
    },

    {
        "words"  : [ "dates","stead","sated","adset" ],
        "decoys" : [ "seats","diety","seeds","today","sited","dotes","tides","duets","deist","diets" ]
    },

    {
        "words"  : [ "spear","parse","reaps","pares" ],
        "decoys" : [ "ramps","tarps","strep","spore","repos","peris","strap","perms","ropes","super" ]
    },

    {
        "words"  : [ "stone","tones","steno","onset" ],
        "decoys" : [ "snout","tongs","stent","tense","terns","santo","stony","toons","snort","stint" ]
    }
]