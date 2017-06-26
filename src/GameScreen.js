
import device;
import ui.View;
import ui.ImageView as ImageView;
import ui.TextView as TextView;
import event.input.InputEvent as InputEvent;
import math.geom.Point as Point;

import src.Bubble as Bubble;
import src.GameOverView as GameOverView
import src.Aimshots as Aimshots;

exports = Class(ui.View, function(supr) {

    //Level configuration constants
    const bubbleWidth = 75;     
    const bubbleHeight = 75;
    const bubbleRadius = bubbleWidth / 2;
    const maxNumOfColumns = 7;      //Maximal number of columns in the level
    const maxNumOfRows = 12;        //Maximal number of rows in the level
    const initialNumOfRows = 5;     //Initial number of rows to be populated in the grid
    const playerBallSpeed = 35;     
    const initialPlayerBallsCount = 22;     //Initial number of player balls
    const levelTopMargin = 150;
    const levelSideMargin = 94;
    const levelHeight = device.height - 200; 
    const levelWidth = device.width; 
    const defaultPlayerBallX = levelWidth/2 - bubbleWidth/2;        //Defaule x of player ball (in the canon)
    const defaultPlayerBallY = levelHeight - bubbleHeight + 90;     //Defaule y of player ball (in the canon)
    const bubblePopAnimLength = 150;        //Duration of bubble removal animation in milliseconds
    const bubbleDropAnimLength = 500;       //Duration of bubble drop animation in milliseconds
    const minMatchClusterSize = 3;               //Minimal number of matching bubbles in a cluster that can be removed.
    
    //Enums for bubble types
    const bubbleTypes = {
        GRAY: 'gray',
        PURPLE: 'purple',
        WHITE: 'white',
        GREEN: 'green'
    };

    //Enums for game states
    const gameStates = {
        INIT: 0,
        READY: 1,
        SHOOTING: 2,
        REMOVING_CLUSTER: 3,
        GAME_OVER: 4
    };

    //Enums for game result
    const gameResults = {
        IN_PROGRESS: 0,
        SUCCESS: 1,
        FAILED: 2
    };

    /**
     * Helper function to convert radian to degree
     * @param {number} rad 
     */
    function radToDeg(rad) {
        return rad * (180 / Math.PI);
    }

    /**
     * Helper function to convert degree to radian 
     * @param {number} angle 
     */
    function degToRad(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * Return a random bubble type
     */
    function getRandomBubbleType() {
        var rand = Math.floor(Math.random() * 4) + 1;
        if(rand == 1) {
            return bubbleTypes.GRAY;
        } else if(rand == 2) {
            return bubbleTypes.GREEN;
        } else if(rand == 3) {
            return bubbleTypes.WHITE;
        } else {
            return bubbleTypes.PURPLE;
        }
    }

    /**
     * Returns the corresponding coordinate of the specified position in the grid.
     * 
     * @param {number} row 
     * @param {number} column 
     * @return {Point}
     */
    function getCoordinateFromGridPosition(row, column) {
        var x =  getHorizontalOffsetOfRow(row) + column * bubbleWidth + levelSideMargin;
        var y = row * bubbleHeight + levelTopMargin; 

        return new Point(x, y);
    }

    /**
     * Returns the corresponding grid position of the specified coordinate.
     * 
     * @param {number} x 
     * @param {number} y 
     * @return {Point}
     */
    function getGridPositionFromCoordinate(x, y) {
        var row = Math.round((y - levelTopMargin) / bubbleHeight);
        var xOffset = getHorizontalOffsetOfRow(row);
        var column = Math.round(Math.max(x - levelSideMargin - xOffset, 0) / bubbleWidth);

        return new Point(column, row);
    }

    /**
     * @param {number} row 
     */
    function getHorizontalOffsetOfRow(row) {
        return (row % 2 > 0) ? (bubbleWidth / 2) : 0;
    }

    /**
     * Check if two circles intersect with each other
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} r1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {number} r2 
     */
    function checkCirclesIntersection(x1, y1, r1, x2, y2, r2) {
        var distanceX = x2 - x1;
        var distanceY = y2 - y1;
        var distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));

        return distance <= (r1 + r2 - 5);
    }

    /**
     * Updates the player ball in the cannon and the ball coming up next.
     */
    this.updatePlayerBall_ = function() {
        var nextPlayerBallType = null;

        //If next ball is visible, update player ball with the type of next ball.
        //It's possible that player earns a new ball using the last shot. In that case,
        //simply update player ball by randomly generating ball type.
        if(this.nextBall_.style.visible) {  
            nextPlayerBallType = this.nextBall_.type;
        } else if(this.remainingBallsCount_ > 0) {
            nextPlayerBallType = getRandomBubbleType();
            this.remainingBallsCount_--;
        } 

        //this.playerBall_ is reused.
        if(nextPlayerBallType !== null) {
            this.playerBall_.setType(nextPlayerBallType);
            this.playerBall_.style.x = defaultPlayerBallX;
            this.playerBall_.style.y = defaultPlayerBallY;
        } 

        this.updatePlayerBallAngle_(this.cannonAngle_);
        this.playerBall_.style.visible = !!nextPlayerBallType;
        
        //this.nextBall_ is reused
        if(this.remainingBallsCount_ > 0) {
            this.nextBall_.setType(getRandomBubbleType());
            this.remainingBallsCount_ -= 1;
            this.nextBall_.style.visible = true;
        } else {
            this.nextBall_.style.visible = false;
        }

        this.updatePlayerBallsCount_();
    };

    /**
     * Check if the grid position is valid for adding a new bubble.
     */
    this.isValidGridPosition_ = function(row, column) {
        //Avoid adding bubble outside level boundaries or adding floating bubbles. 
        if(row < 0 || 
            row > this.bubbleGrid_.length + 1 ||
            column < 0 ||
            column > maxNumOfColumns) {
            return false;
        }

        return true;
    };

    /**
     * Add a new bubble of type to the specified grid position.
     * 
     * @param {number} row 
     * @param {number} column
     * @param type 
     */
    this.addBubbleToGrid_ = function(row, column, type) {
        if(!this.isValidGridPosition_(row, column) || !type) {
            return;
        }

        var coordinate = getCoordinateFromGridPosition(row, column);
        var newBubble = new Bubble({
                superview: this,
                x: coordinate.x,
                y: coordinate.y,
                type: type,
                row: row,
                column: column
            });

        //If the new bubble is to be added in a new row
        if(!this.bubbleGrid_[row]) {
            this.bubbleGrid_[row] = [];
        }

        this.bubbleGrid_[row][column] = newBubble;
    };

    /**
     * Remove a bubble from the grid
     * 
     * @param {Bubble} bubble
     * @return {boolean} if the bubble is successfully removed
     */
    this.removeBubbleFromGrid_ = function(bubble) {
        if(!bubble) {
            return false;
        }

        var target = this.bubbleGrid_[bubble.row][bubble.column];
        if(target) {
            this.bubbleGrid_[bubble.row][bubble.column] = null;
            target.removeFromSuperview(); 
            return true;
        }

        return false;
    };

    /**
     * Returns a valud representing result of the game. If the game is not over yet,
     * gameResults.IN_PROGRESS will be returned.
     * 
     * @return {gameResults}
     */
    this.checkGameResult_ = function() {
        //Reached the bottom of game level
        if(this.bubbleGrid_.length >= maxNumOfRows) {
            return gameResults.FAILED;
        }

        var bubbleCounts = 0;
        for(var i = 0; i < this.bubbleGrid_.length; i++) {
            for(var j = 0; j < this.bubbleGrid_[i].length; j++) {
                if(this.bubbleGrid_[i][j]) {
                    bubbleCounts++;
                }
            }
        }

        //If the grid is cleared
        if(bubbleCounts == 0) {
            return gameResults.SUCCESS;
        } else if (!this.playerBall_.style.visible) {
            return gameResults.FAILED;
        } else {
            return gameResults.IN_PROGRESS;
        }
    };

    /**
     * Clear the 'processed' flags used in cluster searching.
     */
    this.resetProcessedFlag_ = function() {
        for(var i = 0; i < this.bubbleGrid_.length; i++) {
            for(var j = 0; j < this.bubbleGrid_[i].length; j++) {
                if(this.bubbleGrid_[i][j]) {
                    this.bubbleGrid_[i][j].processed = false;
                }
            }
        }
    };

    /**
     * Find the neiboring bubbles of the specified bubble.
     * 
     * @param {Bubble}
     * @return {Array}
     */
    this.getNeighbors_ = function(bubble) {
        var neighbors = [];
        if(bubble) {
            var centerRow = bubble.row;
            var centerColumn = bubble.column;

            //If the center row has horizontal offset, the columns of the neighbors in the adjecent rows (above and below)
            //have an offset as well.
            var columnOffset = (getHorizontalOffsetOfRow(centerRow) > 0) ? 1 : 0;

            var prevRow = centerRow - 1;
            var nextRow = centerRow + 1;
            //Neighbors in the row above
            if(prevRow >= 0) {
                if(this.bubbleGrid_[prevRow][centerColumn + columnOffset - 1]) {
                    neighbors.push(this.bubbleGrid_[prevRow][centerColumn + columnOffset - 1]);
                }
                if(this.bubbleGrid_[prevRow][centerColumn + columnOffset]) {
                    neighbors.push(this.bubbleGrid_[prevRow][centerColumn + columnOffset]);
                }
            }

            //Neighbors in the same row
            if(this.bubbleGrid_[centerRow][centerColumn - 1]) {
                neighbors.push(this.bubbleGrid_[centerRow][centerColumn - 1]);
            }
            if(this.bubbleGrid_[centerRow][centerColumn + 1]) {
                neighbors.push(this.bubbleGrid_[centerRow][centerColumn + 1]);
            }

            //Neighbors in the row below
            if(nextRow < this.bubbleGrid_.length) {
                if(this.bubbleGrid_[nextRow][centerColumn + columnOffset - 1]) {
                    neighbors.push(this.bubbleGrid_[nextRow][centerColumn + columnOffset - 1]);
                }
                if(this.bubbleGrid_[nextRow][centerColumn + columnOffset]) {
                    neighbors.push(this.bubbleGrid_[nextRow][centerColumn + columnOffset]);
                }
            }
        }

        return neighbors;
    };

    /**
     * Find the cluster of bubbles containig the specified grid position.
     * If the matchBubbleType flag is set to true, search for cluster containing
     * only bubbles matching the type of the specified bubble.
     * 
     * @param {number} row
     * @param {number} column
     * @param {boolean} resetFirst
     * @param {boolean} matchBubbleType
     */
    this.findCluster_ = function(row, column, resetFirst, matchBubbleType) {
        if(resetFirst) {
            this.resetProcessedFlag_();
        }
        
        //processed property is to indicate a bubble has been 'visited' so we don't
        //process it more than once.
        var startingBubble = this.bubbleGrid_[row][column];
        startingBubble.processed = true;

        var targetType = startingBubble.type;
        var processQueue = [startingBubble];
        var bubblesInCluster = [];

        //For each bubble in the queue, find the neibors. Add those neighbors to the queue
        //if they haven't been processed. Continue this operation until the queue is empty. 
        while(processQueue.length > 0) {
            var currentBubble = processQueue.pop();
            //If matchBubbleType is false, process all adjacent bubbles regardless of types.
            if(!matchBubbleType || currentBubble.type == targetType) {
                bubblesInCluster.push(currentBubble);
                var neighbors = this.getNeighbors_(currentBubble);
                for(var i = 0; i < neighbors.length; i++) {
                    if(!neighbors[i].processed) {
                        neighbors[i].processed = true;
                        processQueue.push(neighbors[i]);
                    }
                }
            }
        }

        return bubblesInCluster;
    };

    /**
     * Returns all "floating" clusters in the level.
     * 
     * @return {Array}
     */
    this.findFloatingClusters = function() {
        this.resetProcessedFlag_();

        //Set processed flag to true for all bubbles to be removed so we don't 
        //process them in this function.
        if(this.clusterToBeRemoved_) {
            for(var i = 0; i < this.clusterToBeRemoved_.length; i++) {
                this.clusterToBeRemoved_[i].processed = true;
            }
        }

        var foundClusters = [];

        for(var row = 0; row < this.bubbleGrid_.length; row++) {
            for(var column = 0; column < this.bubbleGrid_[row].length; column++) {
                var bubble = this.bubbleGrid_[row][column];
                if(bubble && !bubble.processed) {
                    var containingCluster = this.findCluster_(row, column, false, false);
                    
                    if(containingCluster.length > 0) {
                        var isFloatingCluster = true;

                        //If any bubble in the cluster is in row 0, it's not a floating cluster.
                        for(var k = 0; k < containingCluster.length; k++) {
                            if(containingCluster[k] && containingCluster[k].row == 0) {
                                isFloatingCluster = false;
                                break;
                            }
                        }

                        if(isFloatingCluster) {
                            foundClusters.push(containingCluster);
                        }
                    }
                }
            }
        }

        return foundClusters;
    };

    /**
     * Snap the player ball to the grid based on its current coordinate.
     */
    this.snapPlayerBall_ = function() {
        //Add the ball to the grid based on its coordinate in the level
        var targetPosition = getGridPositionFromCoordinate(this.playerBall_.style.x, this.playerBall_.style.y);
        targetPosition.x = Math.max(Math.min(targetPosition.x, maxNumOfColumns - 1), 0);

        //If the target position is not empty, go to the next row until we find an empty spot.
        while(this.bubbleGrid_[targetPosition.y] && this.bubbleGrid_[targetPosition.y][targetPosition.x]) {
            targetPosition.y += 1;
        }

        this.addBubbleToGrid_(targetPosition.y, targetPosition.x, this.playerBall_.type);

        //Temporarily hide this.playerBall_
        this.playerBall_.style.visible = false;

        //Find the cluster of matching bubbles
        this.clusterToBeRemoved_ = this.findCluster_(targetPosition.y, targetPosition.x, true, true);

        //If there are at least 3 bubbles in the cluster, remove the cluster from the bubble grid.
        if(this.clusterToBeRemoved_.length >= minMatchClusterSize) {
            this.floatingClusters_ = this.findFloatingClusters();
            this.removeClusterSpan_ = 0;
            this.successfulShotsCount_++;

            //If the player earns a new player for every 3 successful shots (popped bubbles).
            if(this.successfulShotsCount_ >= 3) {
                this.remainingBallsCount_++;
                this.successfulShotsCount_ = 0;
            }
            
            this.gameState_ = gameStates.REMOVING_CLUSTER;
        } else {
            this.postCycle_();
        }
    }

    /**
     * State in which the player ball is being shot. 
     * @param {number} dt
     */
    this.onStateShooting_ = function(dt) {
        this.playerBall_.style.x += playerBallSpeed * Math.cos(degToRad(this.playerBallAngle_));
        this.playerBall_.style.y += -1 * playerBallSpeed * Math.sin(degToRad(this.playerBallAngle_));

        var ballCenterX = this.playerBall_.style.x + bubbleWidth/2;
        var ballCenterY = this.playerBall_.style.y + bubbleHeight/2;

        //Collision detection for the top of the level
        if(ballCenterY <= levelTopMargin + bubbleRadius) {
            this.snapPlayerBall_();
            return;
        }

        //Collision detection for the left and right boundaries of the level
        if(this.playerBall_.style.x + bubbleWidth >= levelWidth - levelSideMargin) {
            this.playerBallAngle_ = 180 - this.playerBallAngle_;
        } else if(this.playerBall_.style.x <= levelSideMargin) {
            this.playerBallAngle_ = 180 - this.playerBallAngle_;
        }

        //Collision with other bubbles in the grid
        for(var i = 0; i < this.bubbleGrid_.length; i++) {
            for(var j = 0; j < this.bubbleGrid_[i].length; j++) {
                var b = this.bubbleGrid_[i][j];
                if(b) {
                    var bubbleCoordinate = getCoordinateFromGridPosition(i, j);
                    if(checkCirclesIntersection(ballCenterX, ballCenterY, bubbleRadius, (bubbleCoordinate.x + bubbleRadius), (bubbleCoordinate.y + bubbleRadius), bubbleRadius)) {
                        this.snapPlayerBall_();
                        return;
                    }    
                }
            }
        }
        
    };

    /**
     * State in which the matching cluster and floating clusters are being removed.
     * 
     * @param {number} dt
     */
    this.onStateRemoveCluster_ = function(dt) {
        this.removeClusterSpan_ += dt;
        if(this.removeClusterSpan_ < bubbleDropAnimLength) {
            //Matching bubbles removal animation
            for(var j = 0; j < this.clusterToBeRemoved_.length; j++) {
                this.clusterToBeRemoved_[j].style.opacity = Math.max(bubblePopAnimLength - this.removeClusterSpan_, 0) / bubblePopAnimLength;
            }
            
            //Floating bubbles dropping animation
            for(var j = 0; j < this.floatingClusters_.length; j++) {
                for(var k = 0; k < this.floatingClusters_[j].length; k++) {
                    this.floatingClusters_[j][k].style.opacity = (bubbleDropAnimLength - this.removeClusterSpan_) / bubbleDropAnimLength;
                    this.floatingClusters_[j][k].style.y += dt;
                }
            }
        } else {
            //Remove matching bubbles from the grid
            for(var j = 0; j < this.clusterToBeRemoved_.length; j++) {
                this.removeBubbleFromGrid_(this.clusterToBeRemoved_[j]);
            }

            //Remove floating bubbles from the grid
            for(var j = 0; j < this.floatingClusters_.length; j++) {
                for(var k = 0; k < this.floatingClusters_[j].length; k++) {
                    this.removeBubbleFromGrid_(this.floatingClusters_[j][k]);
                }
            }

            this.postCycle_();
        }
    };

    /**
     */
    this.postCycle_ = function() {
        this.updatePlayerBall_();
        this.gameResult_ = this.checkGameResult_();
        this.gameState_ = (this.gameResult_ == gameResults.IN_PROGRESS) ? gameStates.READY : gameStates.GAME_OVER;
    };

    /**
     * State in which the game is over (either level cleared or failed)
     */
    this.onStateGameOver_ = function() {
        GC.app.engine.removeListener('Tick', this.onTick_);

        //Show corresponding game over view, depending on the game result.
        if(this.gameResult_ == gameResults.SUCCESS) {
            this.gameOverView_.renderSuccessView();
            
        } else {
            this.gameOverView_.renderFailedView();
        }
    };

    /**
     * Update the player ball angle and related UI components.
     * 
     * @param {number} angle
     */
    this.updatePlayerBallAngle_ = function(angle) {
        this.playerBallAngle_ = angle;
        this.cannonView_.style.r = (Math.PI / 2) - degToRad(this.playerBallAngle_);
        this.aimshots_.style.r = (Math.PI / 2) - degToRad(this.playerBallAngle_);
    };

    /**
     * Update the count of remaining player balls in the header.
     */
    this.updatePlayerBallsCount_ = function() {
        var displayedBallsCount = this.remainingBallsCount_;
        if(this.playerBall_.style.visible) {
            displayedBallsCount++;
        }

        if(this.nextBall_.style.visible) {
            displayedBallsCount++;
        }

        this.ballsCountText_.setText('Balls left: ' + displayedBallsCount);
    };
    
    /**
     * Init function
     */
    this.init = function() {
        var opts = {
            x: 0,
            y: 0,
            width: device.width,
            height: device.height
        };

        supr(this, 'init', [opts]);

        //2-D array that holds the gird of bubbles in the level
        this.bubbleGrid_ = [];
        
        //Current player ball
        this.playerBall_ = null;
        
        //Next player ball
        this.nextBall_ = null;
        
        //Player ball angle
        this.playerBallAngle_ = 90;
        
        //Cluster of bubbles to be removed after the player ball is snapped to the bubble grid.
        this.clusterToBeRemoved_ = null;
        
        //Array of floating bubble clusters in the bubble grid.
        this.floatingClusters_ = null;

        //Current game state
        this.gameState_ = gameStates.INIT;

        this.gameResult_;

        //Length of time in remove cluster state.
        this.removeClusterSpan_ = 0;

        this.remainingBallsCount_ = 0;

        this.successfulShotsCount_ = 0;

        this.onTick_ = bind(this, function(dt) {
            switch(this.gameState_) {
                case gameStates.SHOOTING:
                    this.onStateShooting_(dt);
                    break;
                case gameStates.REMOVING_CLUSTER:
                    this.onStateRemoveCluster_(dt);
                    break;
                case gameStates.GAME_OVER:
                    this.onStateGameOver_();
                    break;
                case gameStates.READY:
                default:
                    break;
            }
        });

        this.build();
    };

    /**
     */
    this.startGame = function() {
        this.gameOverView_.hide();

        //Remove all bubbles in the grid if it's not empty.
        if(this.bubbleGrid_ && this.bubbleGrid_.length > 0) {
            for(var i = 0; i < this.bubbleGrid_.length; i++) {
                for(var j = 0; j < this.bubbleGrid_[i].length; j++) {
                    this.removeBubbleFromGrid_(this.bubbleGrid_[i][j]);
                }
            }
        }
        this.bubbleGrid_ = [];

        //Populate bubble grid
        for(var row = 0; row < initialNumOfRows; row++) {
            for(var column = 0; column < maxNumOfColumns; column++) {
                this.addBubbleToGrid_(row, column, getRandomBubbleType());
            }
        }

        //Create player ball
        if(this.playerBall_) {
            this.playerBall_.removeFromSuperview();
        }
        this.playerBall_ = new Bubble({
                superview: this,
                x: defaultPlayerBallX,
                y: defaultPlayerBallY,
                type: getRandomBubbleType()
            });

        //Create next ball
        if(this.nextBall_) {
            this.nextBall_.removeFromSuperview();
        }
        this.nextBall_ = new Bubble({
                superview: this,
                x: defaultPlayerBallX + 250,
                y: defaultPlayerBallY,
                type: getRandomBubbleType()
            });

        //Deduct the generated player ball and next ball
        this.remainingBallsCount_ = initialPlayerBallsCount - 2;
        this.successfulShotsCount_ = 0;
        this.updatePlayerBallsCount_();
        
        this.gameResult_ = gameResults.IN_PROGRESS;
        
        //ENTER READY STATE
        this.gameState_ = gameStates.READY;
        GC.app.engine.on('Tick', this.onTick_);
    };
    
    /**
     * Build UI components in the game.
     */
    this.build = function() {
        //Ocean background
        new ImageView({
            superview: this,
            width: device.width,
            height: device.height,
            image: 'resources/images/ocean.png'
        });  

        //Ship deck background
        new ImageView({
            superview: this,
            width: device.width,
            height: device.height,
            image: 'resources/images/ship_deck.png'
        });

        this.levelView_ = new ui.View({
            superview: this,
            width: levelWidth,
            height: levelHeight
        });

        this.levelView_.on('InputMove', bind(this, function(event) {
            if(this.gameState_ == gameStates.READY) {
                var mousePos = event.srcPoint;
                //The coordinate of bubbles is that of the top-left corner, so we wanna offset the x position of playerBall
                //by half of the bubble width.
                this.cannonAngle_ = radToDeg(Math.atan2(this.playerBall_.style.y - mousePos.y, mousePos.x - (this.playerBall_.style.x + bubbleWidth/2)));

                //Limit the player ball angle between 30 and 150 degree.
                this.cannonAngle_ = Math.max(this.cannonAngle_, 30);
                this.cannonAngle_ = Math.min(this.cannonAngle_, 150);

                this.updatePlayerBallAngle_(this.cannonAngle_);
            }
        }));

        //Shoot the player ball
        this.levelView_.on('InputSelect', bind(this, function(){
            if(this.gameState_ == gameStates.READY) {
                this.gameState_ = gameStates.SHOOTING;
            }
        }));

        //Cannon
        this.cannonView_ = new ImageView({
            superview: this,
            image: 'resources/images/cannon.png',
            x:  device.width / 2 - 150,
            y: device.height - 330,
            width: 300,
            height: 300,
            anchorX: 150,
            anchorY: 180
        });

        this.aimshots_ = new Aimshots({
            superview: this,
            x:  device.width / 2 - 25,
            y: device.height - 480,
            anchorX: 25,
            anchorY: 335
        });

        this.aimshots_.on('InputSelect', bind(this, function(){
            if(this.gameState_ == gameStates.READY) {
                this.gameState_ = gameStates.SHOOTING;
            }
        }));

        //UI to hold the next player ball
        this.nextBallHolder = new ImageView({
            superview: this,
            image: 'resources/images/next_ball_holder.png',
            x:  defaultPlayerBallX + 220,
            y: defaultPlayerBallY - 28,
            width: 130,
            height: 130,
        });

        //The red arrow between cannon and next ball.
        new ImageView({
            superview: this,
            image: 'resources/images/red_arrow.png',
            x: defaultPlayerBallX + 135,
            y: defaultPlayerBallY + 20,
            width: 75,
            height: 52,
        });

        //Remaining ball count in the header
        this.ballsCountText_ = new TextView({
            superview: this,
            width: 250,
            height: 125,
            color: '#461F00',
            fontWeight: 'bold',
            x: device.width - 300
        });

        //Game over view
        this.gameOverView_ = new GameOverView({
            superview: this,
            width: levelWidth,
            height: levelHeight - levelTopMargin,
            x: 0,
            y: levelTopMargin,
            color: 'white',
            visible: false,
            zIndex: 10
        });

        this.gameOverView_.on('gameovercreen:restart', bind(this, this.startGame));
    };
});