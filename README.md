# Expense Tracker

A free expense tracker. Add spending in two taps, see where your money goes with simple charts, set a monthly budget, and download everything as a CSV file.

**Live demo:** https://vikaskapuganti.github.io/expense-tracker/

## Features

- Add an expense with amount, date, category (Food, Travel, Shopping, Bills, Fun, Other) and an optional note
- Monthly total and number of expenses
- Monthly budget with a progress bar: green, amber from 80%, red when over
- Tells you how much you can spend per day for the rest of the month
- Donut chart by category and a bar chart by day, with no chart library
- Expenses grouped by day, with daily totals
- Edit or delete any expense, and switch between months
- Download all expenses as a CSV file for Excel or Google Sheets
- Saved on your device, with no login or sign-up
- Works on any phone, with light and dark mode

## How the numbers work

- **Per-day allowance:** (budget − spent this month) ÷ days left in the month, including today
- **Category %:** category total ÷ month total
- **Donut chart:** an SVG circle with a circumference of 100, so each category’s percentage is drawn directly as the length of its ring segment

## Built with

HTML, CSS and JavaScript. No frameworks and no libraries. Charts are hand-drawn SVG. Data is stored with the browser’s localStorage.

## Run it yourself

Download the files and open `index.html` in any browser.

---

Built by Vikas Kapuganti
