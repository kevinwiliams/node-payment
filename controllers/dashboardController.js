// GET all users
async function getDashboard(req, res){
    try {
    //   const users = await User.findAll();
      res.render('dashboard/index', {title: 'Dashboard'});

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    }
  }

  module.exports = {
    getDashboard
  };