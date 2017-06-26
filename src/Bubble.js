import ui.View;

import ui.ImageView;
import ui.ImageScaleView;
import ui.resource.Image as Image;

exports = Class(ui.View, function(supr) {
    const defaultBubbleWidth = 75;
    const defaultBbubbleHeight = 75;

    function getImagePathByType(type) {
        switch(type) {
            case 'green':
                return 'resources/images/mole_green.png';
            case 'purple':
                return 'resources/images/mole_purple.png';
            case 'white':
                return 'resources/images/mole_white.png';
            case 'gray':
                return 'resources/images/mole_gray.png';
        }
    }

    /**
     */
    this.init = function(opts) {
        this.type = null;
        opts.width = opts.width | defaultBubbleWidth;
        opts.height = opts.height | defaultBbubbleHeight;
        this.imageView = null;
        if(opts.row !== undefined && opts.column !== undefined) {
            this.row = opts.row;
            this.column = opts.column;
        }
        supr(this, 'init', [opts]);

        this.build(opts.type);
    };

    /**
     * Set the type of the bubble
     */
    this.setType = function(type) {
        if(this.imageView) {
            this.imageView.removeFromSuperview();
            this.imageView = null;
        }

        var imagePath = getImagePathByType(type);
        if(imagePath) {
            this.type = type;
            if(this.imageView) {
                this.imageView.removeFromSuperview();
                this.imageView = null;
            }

            this.imageView = new ui.ImageView({
                superview: this,
                image: imagePath,
                autoSize: false,    //Set to false so image is stretched to fit the size of the image view
                width: this.style.width,
                height: this.style.height,
                x: 0,
                y: 0
            });
        } else {
            this.type = null;
        }
    };

    this.build = function(type) {
        this.setType(type);
    };

});