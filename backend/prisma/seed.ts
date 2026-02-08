import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  console.log('🗑️  Cleaning existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@foodapp.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '6912345678',
      role: 'ADMIN',
    },
  });

  // Create customer users
  console.log('👥 Creating customer users...');
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: customerPassword,
      firstName: 'Γιώργος',
      lastName: 'Παπαδόπουλος',
      phone: '6987654321',
      role: 'CUSTOMER',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'maria@example.com',
      password: customerPassword,
      firstName: 'Μαρία',
      lastName: 'Κωνσταντίνου',
      phone: '6976543210',
      role: 'CUSTOMER',
    },
  });

  // Create addresses
  console.log('📍 Creating addresses...');
  await prisma.address.createMany({
    data: [
      {
        userId: customer1.id,
        label: 'Σπίτι',
        street: 'Πατησίων',
        number: '145',
        city: 'Αθήνα',
        postalCode: '11251',
        floor: '3ος',
        isDefault: true,
      },
      {
        userId: customer1.id,
        label: 'Γραφείο',
        street: 'Ακαδημίας',
        number: '23',
        city: 'Αθήνα',
        postalCode: '10671',
        floor: '2ος',
        isDefault: false,
      },
      {
        userId: customer2.id,
        label: 'Σπίτι',
        street: 'Σόλωνος',
        number: '87',
        city: 'Αθήνα',
        postalCode: '10679',
        isDefault: true,
      },
    ],
  });

  // Create categories
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Σαλάτες',
        nameEn: 'Salads',
        description: 'Φρέσκες και υγιεινές σαλάτες',
        slug: 'salads',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ομελέτες',
        nameEn: 'Omelettes',
        description: 'Νόστιμες ομελέτες με διάφορα υλικά',
        slug: 'omelettes',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Κρέπες Αλμυρές',
        nameEn: 'Savory Crepes',
        description: 'Maxi κρέπες με ποικιλία γεύσεων',
        slug: 'savory-crepes',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Κρέπες Γλυκές',
        nameEn: 'Sweet Crepes',
        description: 'Γλυκές κρέπες για κάθε γούστο',
        slug: 'sweet-crepes',
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Club Sandwiches',
        nameEn: 'Club Sandwiches',
        description: 'Τα κλασικά club sandwiches',
        slug: 'club-sandwiches',
        sortOrder: 5,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Burgers',
        nameEn: 'Burgers',
        description: 'Ζουμερά burgers',
        slug: 'burgers',
        sortOrder: 6,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Καφέδες',
        nameEn: 'Coffee',
        description: 'Ζεστός και κρύος καφές',
        slug: 'coffee',
        sortOrder: 7,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Χυμοί',
        nameEn: 'Juices',
        description: 'Φρέσκοι χυμοί',
        slug: 'juices',
        sortOrder: 8,
      },
    }),
  ]);

  // Create menu items
  console.log('🍽️  Creating menu items...');
  
  // Salads
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[0].id,
        name: 'Σαλάτα Καίσαρα',
        nameEn: 'Caesar Salad',
        description: 'Μαρούλι, κοτόπουλο, παρμεζάνα, croutons, σως Caesar',
        price: 8.50,
        isPopular: true,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[0].id,
        name: 'Κρητικός Ντάκος',
        nameEn: 'Cretan Dakos',
        description: 'Παξιμάδι, ντομάτα, φέτα, ελιά, ελαιόλαδο, ρίγανη',
        price: 7.00,
        isPopular: true,
        isAvailable: true,
        sortOrder: 2,
      },
      {
        categoryId: categories[0].id,
        name: 'Σαλάτα Ανάμιχτη',
        nameEn: 'Mixed Salad',
        description: 'Μαρούλι, ντομάτα, αγγούρι, καρότο, λάχανο',
        price: 6.50,
        isAvailable: true,
        sortOrder: 3,
      },
    ],
  });

  // Omelettes
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[1].id,
        name: 'Ομελέτα Σπέσιαλ',
        nameEn: 'Special Omelette',
        description: 'Αυγά, μπέικον, ντομάτα, τυρί, πιπεριά',
        price: 7.50,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[1].id,
        name: 'Ομελέτα με Λουκάνικο',
        nameEn: 'Sausage Omelette',
        description: 'Αυγά, λουκάνικο, τυρί',
        price: 6.50,
        isAvailable: true,
        sortOrder: 2,
      },
    ],
  });

  // Savory Crepes
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[2].id,
        name: 'Κρέπα Εξοχικό',
        nameEn: 'Country Crepe',
        description: 'Μπέικον, λουκάνικο, ντομάτα, πιπεριά, τυρί',
        price: 8.00,
        isPopular: true,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[2].id,
        name: 'Κρέπα Σπέσιαλ',
        nameEn: 'Special Crepe',
        description: 'Κοτόπουλο, μανιτάρια, τυρί cheddar, σως',
        price: 8.50,
        isPopular: true,
        isAvailable: true,
        sortOrder: 2,
      },
      {
        categoryId: categories[2].id,
        name: 'Κρέπα Μαργαρίτα',
        nameEn: 'Margherita Crepe',
        description: 'Ντομάτα, τυρί mozzarella, βασιλικός',
        price: 7.00,
        isAvailable: true,
        sortOrder: 3,
      },
    ],
  });

  // Sweet Crepes
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[3].id,
        name: 'Κρέπα Nutella',
        nameEn: 'Nutella Crepe',
        description: 'Nutella, μπανάνα, φουντούκια',
        price: 6.50,
        isPopular: true,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[3].id,
        name: 'Κρέπα με Μέλι & Καρύδια',
        nameEn: 'Honey & Walnut Crepe',
        description: 'Μέλι, καρύδια, κανέλα',
        price: 6.00,
        isAvailable: true,
        sortOrder: 2,
      },
    ],
  });

  // Club Sandwiches
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[4].id,
        name: 'Club Sandwich Κοτόπουλο',
        nameEn: 'Chicken Club Sandwich',
        description: 'Κοτόπουλο, μπέικον, ντομάτα, μαρούλι, μαγιονέζα',
        price: 7.50,
        isPopular: true,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[4].id,
        name: 'Club Γαλοπούλα',
        nameEn: 'Turkey Club',
        description: 'Γαλοπούλα, ντομάτα, τυρί cheddar, μουστάρδα',
        price: 7.50,
        isPopular: true,
        isAvailable: true,
        sortOrder: 2,
      },
    ],
  });

  // Burgers
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[5].id,
        name: 'Burger Σπέσιαλ',
        nameEn: 'Special Burger',
        description: 'Μοσχαρίσιο μπιφτέκι, μπέικον, τυρί cheddar, ντομάτα, κρεμμύδι',
        price: 9.50,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[5].id,
        name: 'Chicken Burger',
        nameEn: 'Chicken Burger',
        description: 'Κοτόπουλο, μαρούλι, ντομάτα, μαγιονέζα',
        price: 8.50,
        isAvailable: true,
        sortOrder: 2,
      },
    ],
  });

  // Coffee
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[6].id,
        name: 'Espresso',
        nameEn: 'Espresso',
        description: 'Διπλό espresso',
        price: 2.50,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[6].id,
        name: 'Cappuccino',
        nameEn: 'Cappuccino',
        description: 'Ζεστό cappuccino με αφρόγαλα',
        price: 3.50,
        isAvailable: true,
        sortOrder: 2,
      },
      {
        categoryId: categories[6].id,
        name: 'Freddo Cappuccino',
        nameEn: 'Freddo Cappuccino',
        description: 'Κρύος καφές με κρύο αφρόγαλα',
        price: 3.80,
        isPopular: true,
        isAvailable: true,
        sortOrder: 3,
      },
      {
        categoryId: categories[6].id,
        name: 'Freddo Espresso',
        nameEn: 'Freddo Espresso',
        description: 'Κρύο διπλό espresso',
        price: 3.00,
        isAvailable: true,
        sortOrder: 4,
      },
    ],
  });

  // Juices
  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: categories[7].id,
        name: 'Φρέσκος Χυμός Πορτοκάλι',
        nameEn: 'Fresh Orange Juice',
        description: 'Φρεσκοστυμμένος χυμός πορτοκάλι',
        price: 4.50,
        isPopular: true,
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: categories[7].id,
        name: 'Smoothie Φράουλα-Μπανάνα',
        nameEn: 'Strawberry-Banana Smoothie',
        description: 'Φράουλα, μπανάνα, γιαούρτι, μέλι',
        price: 5.00,
        isAvailable: true,
        sortOrder: 2,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`👤 Users: ${await prisma.user.count()}`);
  console.log(`📍 Addresses: ${await prisma.address.count()}`);
  console.log(`📂 Categories: ${await prisma.category.count()}`);
  console.log(`🍽️  Menu Items: ${await prisma.menuItem.count()}`);
  console.log('\n🔐 Login Credentials:');
  console.log('Admin: admin@foodapp.com / admin123');
  console.log('Customer: customer@example.com / customer123');
  console.log('Customer 2: maria@example.com / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
