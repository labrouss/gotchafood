#!/bin/bash
# Food Ordering App - Complete Setup Script

echo "🍕 Food Ordering App - Complete Setup"
echo "======================================"

# Extract admin pages from combined file
echo "📄 Creating admin pages..."

# Create AdminProducts.tsx
sed -n '/=== FILE: \/frontend\/src\/pages\/admin\/AdminProducts.tsx ===/,/=== FILE: \/frontend\/src\/pages\/admin\/AdminOrders.tsx ===/p' ADMIN_PAGES_TO_SPLIT.txt | sed '1d;$d' > frontend/src/pages/admin/AdminProducts.tsx

# Create AdminOrders.tsx
sed -n '/=== FILE: \/frontend\/src\/pages\/admin\/AdminOrders.tsx ===/,/=== FILE: \/frontend\/src\/pages\/admin\/AdminCustomers.tsx ===/p' ADMIN_PAGES_TO_SPLIT.txt | sed '1d;$d' > frontend/src/pages/admin/AdminOrders.tsx

# Create AdminCustomers.tsx
sed -n '/=== FILE: \/frontend\/src\/pages\/admin\/AdminCustomers.tsx ===/,$p' ADMIN_PAGES_TO_SPLIT.txt | sed '1d' > frontend/src/pages/admin/AdminCustomers.tsx

echo "✅ Admin pages created!"

echo ""
echo "🚀 QUICK START:"
echo "1. docker-compose down -v"
echo "2. docker-compose up -d"
echo "3. Wait 3-4 minutes for npm install"
echo "4. docker exec food-ordering-backend npx --yes prisma@5.9.1 db push"
echo "5. docker exec food-ordering-backend npm run prisma:seed"
echo ""
echo "🌐 Access URLs:"
echo "Frontend: http://10.1.11.35:5173 (or http://dockerhost.hpehellas-demo.com:5173)"
echo "Backend:  http://10.1.11.35:3000"
echo ""
echo "🔐 Login Credentials:"
echo "Admin:    admin@foodapp.com / admin123"
echo "Customer: customer@example.com / customer123"
echo ""
echo "✨ Features Available:"
echo "✅ Shopping Cart with Add to Cart buttons"
echo "✅ Checkout & Order Placement"
echo "✅ My Orders - View order history"
echo "✅ My Addresses - Manage delivery addresses"
echo "✅ Admin Dashboard - Statistics"
echo "✅ Admin Categories - Full CRUD"
echo "✅ Admin Products - Full CRUD"
echo "✅ Admin Orders - View & update status"
echo "✅ Admin Customers - View customer list"
echo ""
echo "📝 IMPORTANT NOTES:"
echo "- Cart uses Zustand with localStorage persistence"
echo "- Admin menu appears when logged in as ADMIN"
echo "- All CORS issues fixed for your domain"
echo "- Prisma locked to version 5.9.1"
echo "- API URL hardcoded to 10.1.11.35:3000"
echo ""
echo "🎉 Setup complete! Enjoy your food ordering app!"
