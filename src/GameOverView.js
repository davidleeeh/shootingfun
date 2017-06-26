import device;
import ui.View;

import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.TextView as TextView;

exports = Class(ui.View, function(supr) {
    this.init = function(opts) {
        opts = merge(opts, {
            
        });

        supr(this, 'init', [opts]);

        this.build();
    };

    this.build = function() {
        this.board_ = new ImageView({
            superview: this,
            image: "resources/images/header.png",
            width: device.width - 100,
            height: 700,
            x: 50
        });

        this.header_ = new TextView({
            superview: this,
            color: 'white',
            fontWeight: 'bold',
            x: 175,
            y: 275,
            width: 400,
            height: 200
        });

        this.restartButton_ = new TextView({
            superview: this,
            color: 'white',
            fontWeight: 'bold',
            x: 250,
            y: 500,
            width: 250,
            height: 125
        });

        this.restartButton_.on('InputSelect', bind(this, function(){
            this.emit('gameovercreen:restart');
        }));
    };

    this.renderSuccessView = function() {
        this.header_.setText('Great Job!');
        this.restartButton_.setText('Play again');
        this.style.visible = true;
    };

    this.renderFailedView = function() {
        this.header_.setText('Oh No :(');
        this.restartButton_.setText('Try again');
        this.style.visible = true;
    };

    this.hide = function() {
        this.style.visible = false;
    }
});