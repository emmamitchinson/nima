
function Facility(name,phone,website,email,latitude,longitude) {
    // Return a new instance MyObject if not already instantiated
    if (!(this instanceof Facility)) return new Facility(name,phone,website,email,latitude,longitude);

    this.initialize(name,phone,website,email,latitude,longitude);
}

Facility.prototype = {
    initialize: function(name,phone,website,email,latitude,longitude) {
        this.name = name;
        this.phone = phone;
        this.website = website;
        this.email = email;
        this.latitude = latitude;
        this.longitude = longitude;
    }
};

module.exports = Facility;









// // Constructor
// function Facility(name,phone,website,email,latitude,longitude) {
//     this.name = name;
//     this.phone = phone;
//     this.website = website;
//     this.email = email;
//     this.latitude = latitude;
//     this.longitude = longitude;
// }
//
// // export the class
// module.exports = Facility;


// module.exports.createFacility = function (name,phone,website,email,latitude,longitude) {
//     this.name = name;
//     this.phone = phone;
//     this.website = website;
//     this.email = email;
//     this.latitude = latitude;
//     this.longitude = longitude;
//
//     return this;
// };