
var redirectUrl = "https://nimabotnhs.herokuapp.com?q=";

function Facility(name,phone,website,email,latitude,longitude) {
    if (!(this instanceof Facility)) return new Facility(name,phone,website,email,latitude,longitude);

    this.initialize(name,phone,website,email,latitude,longitude);
}

Facility.prototype = {
    initialize: function(name,phone,website,email,latitude,longitude) {
        var secureWebsite = website ? website.replace("http", "https") : "https://www.google.co.uk/";
        if (!secureWebsite.startsWith("https")) {
            secureWebsite = redirectUrl+ "https://" + secureWebsite;
        }

        this.name = name;
        this.phone = phone;
        this.website = secureWebsite;
        this.email = email;
        this.latitude = latitude;
        this.longitude = longitude;
    }
};

module.exports = Facility;