import device;
import ui.View;

import ui.ImageView as ImageView;
import ui.resource.Image as Image;

exports = Class(ui.View, function(supr) {
    this.init = function(opts) {
        opts = merge(opts, {
            width: 50,
            height: 400    
        });

        supr(this, 'init', [opts]);

        this.build();
    };

    this.build = function() {
        this.aimShots_ = [];
        for(var i = 0; i < 4; i++) {
            this.aimShots_.push(new ImageView({
                superview: this,
                image: 'resources/images/aimshot.png',
                x: 0,
                y: i * 50,
                width: 50,
                height: 50,
            }))
        }        
    };
});