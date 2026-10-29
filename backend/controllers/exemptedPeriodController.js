const ExemptedPeriod = require('../models/ExemptedPeriod');

// @desc    Get all exempted periods
// @route   GET /api/exempt-periods
// @access  Private
const getExemptedPeriods = async (req, res) => {
  try {
    const periods = await ExemptedPeriod.find().sort({ fromDate: 1 });
    res.json(periods);
  } catch (error) {
    console.error('getExemptedPeriods error:', error);
    res.status(500).json({ message: 'Server error fetching exempted periods' });
  }
};

// @desc    Create an exempted period
// @route   POST /api/exempt-periods
// @access  Private/Admin
const createExemptedPeriod = async (req, res) => {
  try {
    const { name, fromDate, toDate } = req.body;

    if (!name || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Name, fromDate and toDate are required' });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from > to) {
      return res.status(400).json({ message: 'fromDate must be on or before toDate' });
    }

    const period = await ExemptedPeriod.create({
      name: name.trim(),
      fromDate: from,
      toDate: to,
      createdBy: req.user._id
    });

    res.status(201).json(period);
  } catch (error) {
    console.error('createExemptedPeriod error:', error);
    res.status(500).json({ message: 'Server error creating exempted period' });
  }
};

// @desc    Update an exempted period
// @route   PUT /api/exempt-periods/:id
// @access  Private/Admin
const updateExemptedPeriod = async (req, res) => {
  try {
    const { name, fromDate, toDate } = req.body;
    const period = await ExemptedPeriod.findById(req.params.id);

    if (!period) {
      return res.status(404).json({ message: 'Exempted period not found' });
    }

    if (name !== undefined) period.name = name.trim();
    if (fromDate !== undefined) period.fromDate = new Date(fromDate);
    if (toDate !== undefined) period.toDate = new Date(toDate);

    if (period.fromDate > period.toDate) {
      return res.status(400).json({ message: 'fromDate must be on or before toDate' });
    }

    const updated = await period.save();
    res.json(updated);
  } catch (error) {
    console.error('updateExemptedPeriod error:', error);
    res.status(500).json({ message: 'Server error updating exempted period' });
  }
};

// @desc    Delete an exempted period
// @route   DELETE /api/exempt-periods/:id
// @access  Private/Admin
const deleteExemptedPeriod = async (req, res) => {
  try {
    const period = await ExemptedPeriod.findByIdAndDelete(req.params.id);

    if (!period) {
      return res.status(404).json({ message: 'Exempted period not found' });
    }

    res.json({ message: 'Exempted period deleted successfully' });
  } catch (error) {
    console.error('deleteExemptedPeriod error:', error);
    res.status(500).json({ message: 'Server error deleting exempted period' });
  }
};

module.exports = {
  getExemptedPeriods,
  createExemptedPeriod,
  updateExemptedPeriod,
  deleteExemptedPeriod
};

