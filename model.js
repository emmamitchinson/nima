
module.exports.createFacility = function (name,phone,website,email,latitude,longitude) {
    this.name = name;
    this.phone = phone;
    this.website = website;
    this.email = email;
    this.latitude = latitude;
    this.longitude = longitude;

    return this;
};