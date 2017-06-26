import ui.TextView as TextView;
import ui.StackView as StackView;
import ui.View as View;
import device;

import src.GameScreen as GameScreen;

exports = Class(GC.Application, function () {

  this.initUI = function () {

    var gameScreen = new GameScreen();

    var rootView = new StackView({
			superview: this,
			x: 0,
			y: 0,
			width: device.width,
			height: device.height,
			clip: true
		});

    rootView.push(gameScreen);
    gameScreen.startGame();
  };

  this.launchUI = function () {

  };

});
