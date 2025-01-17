const staffModel = require("../../models/staffModel");
const branchModel = require("../../models/branchModel");
const vendorModel = require("../../models/vendorModel");

exports.getAllVendors = async (req, res) => {

    try {
        const vendors = await vendorModel.find({isDelete: false}).select('qrCode email adminApproved createdAt isActive businessName')
                                .populate({
                                    path: 'businessType',
                                    select: 'en ar'
                                }).sort('-_id');
 
        res.render('vendor', { vendors });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/');
    }
};

exports.viewVendor = async (req, res) => {
  try {

    const vendor = await vendorModel.findById(req.params.id)
                            .populate({
                                path: 'businessType',
                                select: 'en ar'
                            });
    if (!vendor) {
      req.flash("red", "vendor not found!");
      return res.redirect("/vendor"); 
    }

    const branch = await branchModel.find({vendor: req.params.id, isDelete: false}).select('-createdAt -updatedAt -__v').sort('-_id')
    const staff = await staffModel.find({vendor: req.params.id, isDelete: false}).select('qrCode name email mobileNumber occupation')
                                .populate({
                                    path: 'branch',    
                                    select: 'buildingName'
                                }).sort('-_id')

    res.render("vendor_view", { vendor, staff, branch});
  } catch (error) {
      console.log(error);
    if (error.name === "CastError") req.flash("red", "vendor not found!");
    else req.flash("red", error.message);
    res.redirect("/vendor");
  }
};

exports.changeVendorStatus = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        if (!user) {
            req.flash('red', 'Vendor not found.');
            return res.redirect('/vendor');
        }

        user.isActive = req.params.status

        await user.save();

        req.flash('green', 'Status changed successfully.');
        res.redirect('/vendor');
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'User not found!');
        else req.flash('red', error.message);
        res.redirect('/vendor');
    }
};

exports.approvedVendor = async (req, res) => {
    try {
        const user = await vendorModel.findById(req.params.id);

        user.adminApproved = true

        await user.save();

        req.flash('green', 'Vendor application approved successfully.');
        res.redirect('/vendor/'+req.params.id);
    } catch (error) {
        if (error.name === 'CastError' || error.name === 'TypeError')
            req.flash('red', 'vendor not found!');
        else req.flash('red', error.message);
        res.redirect('/vendor/'+req.params.id);
    }
};

