import { expect, test } from '@playwright/test'

test('main page renders without hard-coded sample products or demo notices', async ({page}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', {name:/ความบันเทิงที่ใช่/})).toBeVisible()
  await expect(page.getByText('Netflix Premium')).toHaveCount(0)
  await expect(page.getByText('COMING NEXT')).toHaveCount(0)
})

test('catalog route renders and search is usable', async ({page}) => {
  await page.goto('/products')
  await expect(page.getByRole('heading', {name:'สินค้าทั้งหมด'})).toBeVisible()
  const search=page.getByRole('textbox', {name:'ค้นหาสินค้า'})
  await search.fill('not-a-real-listing')
  await expect(search).toHaveValue('not-a-real-listing')
  await expect(page.getByText('COMING NEXT')).toHaveCount(0)
})

test('anonymous dashboard redirects to sign in', async ({page}) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByRole('heading', {name:'เข้าสู่ระบบ'})).toBeVisible()
})

test('anonymous wallet and orders redirect to sign in', async ({page}) => {
  await page.goto('/wallet')
  await expect(page).toHaveURL(/\/login\?next=/)
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login\?next=/)
})

test('rental routes have been removed from single-store web app', async ({page}) => {
  await page.goto('/platform-admin')
  await expect(page.getByRole('heading',{name:'ไม่พบหน้านี้'})).toBeVisible()
  await page.goto('/rent')
  await expect(page.getByRole('heading',{name:'ไม่พบหน้านี้'})).toBeVisible()
})

test('old tenant route is not part of the storefront', async ({page}) => {
  await page.goto('/s/maillys')
  await expect(page.getByRole('heading', {name:'ไม่พบหน้านี้'})).toBeVisible()
})

test('register rejects mismatched passwords before network call', async ({page}) => {
  await page.goto('/register')
  await page.getByRole('textbox', {name:'อีเมล'}).fill('test@example.com')
  await page.getByLabel('รหัสผ่าน', {exact:true}).fill('validpassword123')
  await page.getByLabel('ยืนยันรหัสผ่าน').fill('differentpassword123')
  await page.getByRole('button', {name:'สร้างบัญชีใหม่'}).click()
  await expect(page.getByRole('alert')).toContainText('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
})
