const CategoryService = require('../services/CategoryService');

class CategoryController {
  // GET /api/categories
  async getAll(req, res) {
    try {
      const partnerId = req.user.partner_id || req.user.Partner?.id;
      const categories = await CategoryService.getAll(req.user.id, partnerId);
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/categories
  async create(req, res) {
    try {
      const cat = await CategoryService.create(req.user.id, req.body);
      res.status(201).json(cat);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /api/categories/:id
  async update(req, res) {
    try {
      const cat = await CategoryService.update(req.user.id, req.params.id, req.body);
      res.json(cat);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /api/categories/:id
  async delete(req, res) {
    try {
      await CategoryService.delete(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new CategoryController();
