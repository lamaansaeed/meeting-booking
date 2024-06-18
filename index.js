const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'safoora777', // Change this to your MySQL password
  database: 'meeting_booking'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to the database.');
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname)));

// Get available time slots
app.get('/api/timeslots', (req, res) => {
  db.query('SELECT * FROM time_slots', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Get bookings
app.get('/api/bookings', (req, res) => {
  db.query('SELECT * FROM bookings', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Book a slot
app.post('/api/book', (req, res) => {
  const { name, email, slotId } = req.body;

  db.beginTransaction(err => {
    if (err) throw err;

    db.query('SELECT slots_available FROM time_slots WHERE id = ?', [slotId], (err, results) => {
      if (err) return db.rollback(() => { throw err; });

      if (results[0].slots_available > 0) {
        db.query('UPDATE time_slots SET slots_available = slots_available - 1 WHERE id = ?', [slotId], (err, result) => {
          if (err) return db.rollback(() => { throw err; });

          db.query('INSERT INTO bookings (name, email, slot_id) VALUES (?, ?, ?)', [name, email, slotId], (err, result) => {
            if (err) return db.rollback(() => { throw err; });

            db.commit(err => {
              if (err) return db.rollback(() => { throw err; });
              res.json({ message: `Hi ${name}, please join the meeting.`, bookingId: result.insertId });
            });
          });
        });
      } else {
        res.status(400).json({ message: 'No slots available.' });
      }
    });
  });
});

// Cancel a booking
app.post('/api/cancel', (req, res) => {
  const { bookingId } = req.body;

  db.beginTransaction(err => {
    if (err) throw err;

    db.query('SELECT slot_id FROM bookings WHERE id = ?', [bookingId], (err, results) => {
      if (err) return db.rollback(() => { throw err; });

      const slotId = results[0].slot_id;

      db.query('DELETE FROM bookings WHERE id = ?', [bookingId], (err, result) => {
        if (err) return db.rollback(() => { throw err; });

        db.query('UPDATE time_slots SET slots_available = slots_available + 1 WHERE id = ?', [slotId], (err, result) => {
          if (err) return db.rollback(() => { throw err; });

          db.commit(err => {
            if (err) return db.rollback(() => { throw err; });
            res.json({ message: 'Booking cancelled and slot increased.' });
          });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
