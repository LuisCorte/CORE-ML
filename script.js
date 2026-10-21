import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, deleteDoc, doc, updateDoc, where, getDoc, Timestamp, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de Firebase (asegúrate de usar tus propias credenciales)
const firebaseConfig = {
  apiKey: "AIzaSyBFd_q9rNcXi9XTygDr3DBOysnuYnK_Ttg",
  authDomain: "control-inventario-6b091.firebaseapp.com",
  projectId: "control-inventario-6b091",
  storageBucket: "control-inventario-6b091.firebasestorage.app",
  messagingSenderId: "501006845193",
  appId: "1:501006845193:web:17f06bbb0e8a78be73ffd8",
  measurementId: "G-7YKQFY97QJ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- REFERENCIAS DEL DOM ---
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const appSection = document.getElementById('app-section');
const authContainer = document.getElementById('auth-container');
const inventoryTableBody = document.getElementById('inventory-table-body');
const searchInput = document.getElementById('search-input');
const productForm = document.getElementById('product-form');
const logoutButton = document.getElementById('logout-button');
const loadingMessage = document.getElementById('loading-message');
const csvFile = document.getElementById('csv-file');
const uploadCsvButton = document.getElementById('upload-csv-button');
const formButtons = document.getElementById('form-buttons');
const inventoryTabButton = document.getElementById('inventory-tab-button');
const addProductTabButton = document.getElementById('add-product-tab-button');
const reportsTabButton = document.getElementById('reports-tab-button');
const salesTabButton = document.getElementById('sales-tab-button');
const inventorySection = document.getElementById('inventory-section');
const productFormSection = document.getElementById('product-form-section');
const reportsSection = document.getElementById('reports-section');
const salesSection = document.getElementById('sales-section');
const salesSearchInput = document.getElementById('sales-search-input');
const salesTableBody = document.getElementById('sales-table-body');
const salesReportTodayButton = document.getElementById('sales-report-today');
const salesReportMonthButton = document.getElementById('sales-report-month');
const salesReportYearButton = document.getElementById('sales-report-year');
const salesReportProfitButton = document.getElementById('sales-report-profit');
const exportLowStockPdfButton = document.getElementById('export-low-stock-pdf-button');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmButton = document.getElementById('confirm-button');
const cancelButton = document.getElementById('cancel-button');
const modalMessage = document.getElementById('modal-message');
const editProductButton = document.getElementById('edit-product-button');
const deleteProductButton = document.getElementById('delete-product-button');
const selectedProductMessage = document.getElementById('selected-product-message');
const usersTabButton = document.getElementById('users-tab-button');
const usersManagementSection = document.getElementById('users-management-section');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');


// --- VARIABLES ---
const navButtons = [inventoryTabButton, addProductTabButton, reportsTabButton, salesTabButton, usersTabButton];
const contentSections = [inventorySection, productFormSection, reportsSection, salesSection, usersManagementSection];
let allProducts = [];
let editingProductId = null;
let currentUserRole = 'vendedor'; 
let allRegisteredUsers = [];
let allUserRoles = {}; 

// --- UTILIDADES ---
const displayMessage = (text, isError = false) => {
    const popupContainer = document.createElement('div');
    popupContainer.className = `fixed bottom-5 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-xl text-center z-50 transition-all duration-300 transform scale-0 opacity-0 ${isError ?
        'bg-red-500 text-white' : 'bg-green-500 text-white'}`;
    popupContainer.textContent = text;
    document.body.appendChild(popupContainer);
    
    setTimeout(() => {
        popupContainer.classList.remove('scale-0', 'opacity-0');
        popupContainer.classList.add('scale-100', 'opacity-100');
    }, 10);
    setTimeout(() => {
        popupContainer.classList.remove('scale-100', 'opacity-100');
        popupContainer.classList.add('scale-0', 'opacity-0');
        setTimeout(() => {
            document.body.removeChild(popupContainer);
        }, 300);
    }, 3000);
};

const showTab = (tabToShow) => {
    contentSections.forEach(section => {
        section.classList.add('hidden');
    });
    navButtons.forEach(button => {
        // Corrección de la clase de Tailwind: hover:text-white es más estándar que hover:text-gray-200 para dark mode
        button.classList.remove('bg-gray-700', 'text-white');
        button.classList.add('text-gray-400', 'hover:text-white'); 
    });
    tabToShow.classList.remove('hidden');
    
    // El botón se selecciona por su ID, no por el ID de la sección
    let buttonToShow = navButtons.find(btn => btn.id.includes(tabToShow.id.replace('-section', '')));

    // Excepción: Product Form (se activa desde add-product-tab-button)
    if (tabToShow.id === 'product-form-section') {
        buttonToShow = addProductTabButton;
    }

    if (buttonToShow) {
        buttonToShow.classList.add('bg-gray-700', 'text-white');
        buttonToShow.classList.remove('text-gray-400', 'hover:text-white');
    }
};

const showConfirmationModal = (message, onConfirm) => {
    modalMessage.textContent = message;
    confirmationModal.classList.remove('hidden');
    
    // Se asegura de limpiar cualquier listener anterior
    confirmButton.removeEventListener('click', confirmButton.handler);
    cancelButton.removeEventListener('click', cancelButton.handler);

    const handleConfirm = () => {
        onConfirm();
        confirmationModal.classList.add('hidden');
        // Limpieza de listeners después de la acción
        confirmButton.removeEventListener('click', confirmButton.handler);
        cancelButton.removeEventListener('click', cancelButton.handler);
    };

    const handleCancel = () => {
        confirmationModal.classList.add('hidden');
        // Limpieza de listeners después de la acción
        confirmButton.removeEventListener('click', confirmButton.handler);
        cancelButton.removeEventListener('click', cancelButton.handler);
    };

    // Almacena y asigna el handler para poder removerlo
    confirmButton.handler = handleConfirm;
    cancelButton.handler = handleCancel;
    
    confirmButton.addEventListener('click', confirmButton.handler);
    cancelButton.addEventListener('click', cancelButton.handler);
};

const updateActionButtons = (product) => {
    // Si no es Admin, forzar el estado de deshabilidado y texto
    if (currentUserRole !== 'admin') {
        editProductButton.disabled = true;
        deleteProductButton.disabled = true;
        editProductButton.classList.add('hidden'); // Ocultar para Vendedor
        deleteProductButton.classList.add('hidden'); // Ocultar para Vendedor
        selectedProductMessage.textContent = 'Selecciona un producto (solo lectura para Vendedor).';
        return; 
    }

    // Lógica para Admin
    editProductButton.classList.remove('hidden');
    deleteProductButton.classList.remove('hidden');
    
    if (product) {
        editProductButton.disabled = false;
        deleteProductButton.disabled = false;
        editProductButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
        editProductButton.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
        deleteProductButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
        deleteProductButton.classList.add('bg-red-500', 'hover:bg-red-600');
        selectedProductMessage.textContent = `Producto seleccionado: ${product.nombre}`;
    } else {
        editProductButton.disabled = true;
        deleteProductButton.disabled = true;
        editProductButton.classList.add('bg-gray-500', 'cursor-not-allowed');
        editProductButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        deleteProductButton.classList.add('bg-gray-500', 'cursor-not-allowed');
        deleteProductButton.classList.remove('bg-red-500', 'hover:bg-red-600');
        selectedProductMessage.textContent = 'Selecciona un producto para habilitar las acciones.';
    }
};

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        appSection.classList.remove('hidden'); 
            // 1. Verificar el rol en Firestore y asignar a la variable global
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    // 🚨 CÓDIGO CORREGIDO 🚨
    // Si el documento existe, toma el rol que está guardado (admin, seller, etc.).
    // Solo si el documento o el campo 'role' no existe, asigna 'vendedor' por defecto.
    let userRoleFromFirestore = 'vendedor'; // Valor por defecto si no se encuentra nada

    if (userDoc.exists() && userDoc.data().role) {
        userRoleFromFirestore = userDoc.data().role;
    }

    currentUserRole = userRoleFromFirestore; 
    // 🚨 FIN DEL CÓDIGO CORREGIDO 🚨


    // 2. Cargar datos de la aplicación
    loadProducts(user.uid); 

    // 🚀 LÍNEA NUEVA 1: Si es Admin, carga los roles para la gestión de usuarios
    if (currentUserRole === 'admin') {
        // Si estás usando la función loadUserRoles() antigua, ¡recuerda que la reemplazamos por fetchAndRenderUsers()!
        // Si ya hiciste el Paso 3, tu código aquí debería ser:
        // fetchAndRenderUsers(); 
    }

    // 3. Ajuste de Visibilidad de Menús (Lógica centralizada)
    updateNavVisibility(currentUserRole);

      // 4. Decidir qué pestaña mostrar al inicio
if (currentUserRole === 'admin') {
    // Solo llama a showTab si el elemento existe
    if (inventorySection) {
        showTab(inventorySection); 
    }
} else {
    if (salesSection) {
        showTab(salesSection); 
    }
}
        
    } else {
        authContainer.classList.remove('hidden');
        appSection.classList.add('hidden');
        // Asegurar que la aplicación esté limpia al cerrar sesión
        currentUserRole = 'vendedor'; 
        updateNavVisibility(currentUserRole);
    }
});

document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

document.getElementById('register-button').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

 try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 🚨 CÓDIGO CLAVE: GUARDAMOS EMAIL Y ESTATUS PENDIENTE 🚨
        await setDoc(doc(db, "users", user.uid), { 
            email: email, // <-- GUARDAMOS EL CORREO PARA EL ADMIN
            role: 'seller', // Rol por defecto
            status: 'pending', // <-- ESTADO CLAVE: PENDIENTE DE AUTORIZACIÓN
            createdAt: Timestamp.now()
        });

        // 🚨 2. ESTA LÍNEA SE AÑADE 🚨: Fuerza el cierre de la sesión automática
        await signOut(auth);

        displayMessage("¡Cuenta creada con éxito! Espera la autorización de un administrador para iniciar sesión.", false, 8000);
        
        // Regresa a la vista de login
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');

    } catch (error) {
        console.error("Error al registrar:", error.message);
        displayMessage("Error al registrarse: " + error.message, true);
    }
});

document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user; // Obtenemos el usuario de Firebase Auth

        // 🚨 CÓDIGO CLAVE: VERIFICACIÓN DEL ESTATUS EN FIRESTORE 🚨

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.status === 'pending') {
                // 1. Si está pendiente, cerramos la sesión forzosamente
                await signOut(auth);
                displayMessage("Tu cuenta está pendiente de autorización por un administrador. Acceso denegado.", true, 6000);
                return; // Detiene la ejecución
            }

        } else {
            // 2. Si el documento no existe (no tiene rol/perfil), también bloqueamos.
            await signOut(auth);
            displayMessage("Error: No se encontró tu perfil de usuario. Contacta a soporte.", true, 6000);
            return;
        }

        // Si el código llega aquí, significa que el usuario está APROBADO.
        displayMessage("Inicio de sesión exitoso.");

    } catch (error) {
        // Maneja errores comunes de Firebase (contraseña incorrecta, usuario no existe, etc.)
        let errorMessage = "Error al iniciar sesión. Verifica tu correo y contraseña.";
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             errorMessage = "Correo o contraseña inválida.";
        }

        console.error("Error during login:", error.message);
        displayMessage(errorMessage, true);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);

        // 🚨 IMPLEMENTACIÓN DE SEGURIDAD: Limpiar campos de login 🚨
        
        // Vaciamos el Correo y la Contraseña del formulario de Login
        loginEmailInput.value = '';
        loginPasswordInput.value = '';
        
        // También limpiamos los campos del formulario de Registro (si existen en el DOM)
        // Esto evita que datos sensibles queden visibles en la pantalla.
        const registerEmailInput = document.getElementById('register-email');
        const registerPasswordInput = document.getElementById('register-password');
        const registerNameInput = document.getElementById('register-name'); // Si ya implementaste el campo de nombre
        
        if (registerEmailInput) registerEmailInput.value = '';
        if (registerPasswordInput) registerPasswordInput.value = '';
        if (registerNameInput) registerNameInput.value = '';


    } catch (error) {
        console.error("Error during logout:", error.message);
        displayMessage("Error al cerrar sesión: " + error.message, true);
    }
});

// --- GESTIÓN DE PRODUCTOS ---
const resetForm = () => {
    productForm.reset();
    editingProductId = null;
    document.getElementById('product-form-title').textContent = 'Agregar Nuevo Producto';
    document.getElementById('save-product-button').textContent = 'Guardar Producto';
};

document.getElementById('reset-form-button').addEventListener('click', resetForm);

const loadProductForEditing = (product) => {
    document.getElementById('product-form-title').textContent = 'Editar Producto';
    document.getElementById('save-product-button').textContent = 'Actualizar Producto';
    document.getElementById('product-name').value = product.nombre;
    document.getElementById('product-brand').value = product.marca;
    document.getElementById('product-category').value = product.categoria;
    document.getElementById('product-supplier').value = product.proveedor;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-cost').value = product.precioCompra;
    document.getElementById('product-price').value = product.precioVenta;
    document.getElementById('product-image-url').value = product.imagen;
    editingProductId = product.id;
    showTab(productFormSection);
};

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
        displayMessage("Necesitas iniciar sesión para agregar productos.", true);
        return;
    }
    
    // El Admin es el único que puede agregar/editar productos
    if (currentUserRole !== 'admin') {
        displayMessage("Solo los Administradores pueden gestionar el inventario.", true);
        return;
    }


    const productData = {
        nombre: document.getElementById('product-name').value,
        marca: document.getElementById('product-brand').value,
        categoria: document.getElementById('product-category').value,
        proveedor: document.getElementById('product-supplier').value,
        stock: parseInt(document.getElementById('product-stock').value),
        precioCompra: parseFloat(document.getElementById('product-cost').value),
        precioVenta: parseFloat(document.getElementById('product-price').value),
        imagen: document.getElementById('product-image-url').value,
        userId: user.uid, // Mantener el registro de quién lo creó
    };

    try {
        if (editingProductId) {
            const productRef = doc(db, "products", editingProductId);
            await updateDoc(productRef, productData);
            displayMessage("Producto actualizado con éxito.");
        } else {
            productData.createdAt = new Date();
            await addDoc(collection(db, "products"), productData);
            displayMessage("Producto agregado con éxito.");
        }
        resetForm();
    } catch (e) {
        console.error("Error saving the product:", e);
        displayMessage("Error al guardar el producto: " + e.message, true);
    }
});

uploadCsvButton.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
        displayMessage("Necesitas iniciar sesión para cargar un archivo.", true);
        return;
    }
    if (currentUserRole !== 'admin') {
        displayMessage("Solo los Administradores pueden subir CSV.", true);
        return;
    }
    if (csvFile.files.length === 0) {
        displayMessage("Por favor, selecciona un archivo CSV.", true);
        return;
    }

    const file = csvFile.files[0];
    const reader = new FileReader();

    loadingMessage.classList.remove('hidden');
    formButtons.classList.add('hidden');

    reader.onload = async (e) => {
        const text = e.target.result;
        // Manejar correctamente el salto de línea y evitar filas vacías/finales
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const productsToUpload = [];

        // Iniciar en 1 para saltar el encabezado
        for (let i = 1; i < rows.length; i++) {
            // Usar una expresión regular para manejar comas dentro de campos (si usas comillas) o simplemente split
            const row = rows[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, '')); 
            
            if (row.length >= 8 && row[0].trim() !== '') { // Validación básica
                try {
                    const product = {
                        nombre: row[0],
                        marca: row[1],
                        categoria: row[2],
                        proveedor: row[3],
                        // Asegurar que sean números, si fallan, se asigna 0/un valor seguro.
                        stock: parseInt(row[4]) || 0,
                        precioCompra: parseFloat(row[5]) || 0.00,
                        precioVenta: parseFloat(row[6]) || 0.00,
                        imagen: row[7],
                        userId: user.uid,
                        createdAt: new Date()
                    };
                    productsToUpload.push(product);
                } catch (error) {
                    console.error("Error processing row:", row, error);
                    displayMessage(`Error al procesar la fila ${i + 1}. Asegúrate de que los valores numéricos sean correctos.`, true);
                }
            }
        }

        try {
            const uploadPromises = productsToUpload.map(product => addDoc(collection(db, "products"), product));
            await Promise.all(uploadPromises);
            displayMessage(`Se han cargado ${productsToUpload.length} productos con éxito.`);
        } catch (error) {
            console.error("Error uploading products:", error);
            displayMessage("Error al subir los productos. " + error.message, true);
        } finally {
            loadingMessage.classList.add('hidden');
            formButtons.classList.remove('hidden');
            csvFile.value = ''; // Limpiar el campo de archivo
        }
    };
    reader.readAsText(file);
});

searchInput.addEventListener('keyup', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = allProducts.filter(product =>
        // Eliminar 'product.id' de la búsqueda, no es útil para el usuario final
        (product.nombre && product.nombre.toLowerCase().includes(searchTerm)) ||
        (product.marca && product.marca.toLowerCase().includes(searchTerm)) ||
        (product.proveedor && product.proveedor.toLowerCase().includes(searchTerm)) ||
        (product.categoria && product.categoria.toLowerCase().includes(searchTerm)) // Añadir búsqueda por categoría
    );
    renderProducts(filteredProducts);
});

const deleteProduct = async () => {
    const user = auth.currentUser;
    if (!user || currentUserRole !== 'admin') {
        displayMessage("Solo los Administradores pueden borrar productos.", true);
        return;
    }
    
    showConfirmationModal("¿Estás seguro de que quieres borrar este producto? Esta acción no se puede deshacer.", async () => {
        if (editingProductId) {
            const productRef = doc(db, "products", editingProductId);
            try {
                await deleteDoc(productRef);
                displayMessage("Producto borrado con éxito.");
                editingProductId = null;
                updateActionButtons(null);
                // Asegurar la limpieza de la selección visual
                document.querySelectorAll('#inventory-table-body tr').forEach(row => row.classList.remove('bg-gray-700', 'selected-row'));
            } catch (e) {
                console.error("Error deleting the product:", e);
                displayMessage("Error al borrar el producto: " + e.message, true);
            }
        }
    });
};

const handleRowClick = (e) => {
    const clickedRow = e.target.closest('tr');
    if (clickedRow) {
        const productId = clickedRow.dataset.id;
        const product = allProducts.find(p => p.id === productId);

        // Deseleccionar todas las filas visualmente
        document.querySelectorAll('#inventory-table-body tr').forEach(row => row.classList.remove('bg-gray-700', 'selected-row'));
        
        // Determinar si se hizo clic en una fila ya seleccionada (toggle)
        if (editingProductId === productId) {
             // Si es la misma, deseleccionar
            editingProductId = null;
            updateActionButtons(null);
        } else {
            // Si es nueva, seleccionar
            clickedRow.classList.add('bg-gray-700', 'selected-row');
            editingProductId = productId;
            updateActionButtons(product);
        }
    }
};

inventoryTableBody.addEventListener('click', handleRowClick);
editProductButton.addEventListener('click', () => {
    if (editingProductId) {
        const product = allProducts.find(p => p.id === editingProductId);
        loadProductForEditing(product);
    }
});
deleteProductButton.addEventListener('click', deleteProduct);

// --- GESTIÓN DE VENTAS ---
salesSearchInput.addEventListener('keyup', () => {
    const searchTerm = salesSearchInput.value.toLowerCase();
    const filteredProducts = allProducts.filter(product =>
        (product.nombre && product.nombre.toLowerCase().includes(searchTerm)) ||
        (product.marca && product.marca.toLowerCase().includes(searchTerm)) ||
        (product.categoria && product.categoria.toLowerCase().includes(searchTerm)) // Añadir búsqueda por categoría
    );
    renderSalesProducts(filteredProducts);
});

salesTableBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('sell-button')) {
        const productId = e.target.dataset.id;
        const product = allProducts.find(p => p.id === productId);
        
        if (!auth.currentUser) {
             displayMessage("Debes iniciar sesión para registrar una venta.", true);
             return;
        }

        if (product && product.stock > 0) {
            // Usar un prompt más robusto o idealmente un modal para la cantidad
            const quantityInput = prompt(`¿Cuántas unidades de "${product.nombre}" deseas vender? (Stock actual: ${product.stock})`);
            const quantityToSell = parseInt(quantityInput);
            
            if (isNaN(quantityToSell) || quantityToSell <= 0) {
                if(quantityInput !== null) { // Si no es null (el usuario no canceló)
                    displayMessage("Cantidad no válida.", true);
                }
                return;
            }

            if (quantityToSell > product.stock) {
                displayMessage(`No hay suficiente stock. Solo hay ${product.stock} unidades disponibles.`, true);
                return;
            }
            
            showConfirmationModal(`¿Deseas confirmar la venta de ${quantityToSell} unidad(es) de ${product.nombre} por $${(quantityToSell * product.precioVenta).toFixed(2)}?`, async () => {
    const newStock = product.stock - quantityToSell;
    const user = auth.currentUser;
    const productRef = doc(db, "products", productId);
    
    // 🚀 INICIO DEL LOTE: Creamos un lote para un único viaje de red
    const batch = writeBatch(db); 
    const salesCollectionRef = collection(db, `users/${user.uid}/sales`);
    
    // 1. Operación del Lote: Actualizar el stock del producto
    // Se añade la operación al lote en lugar de ejecutarla directamente.
    batch.update(productRef, {
        stock: newStock
    });
    
    // 2. Operación del Lote: Registrar la venta en la subcolección
    // Se añade la operación al lote. Usamos batch.set en un nuevo documento.
    const newSaleDocRef = doc(salesCollectionRef); 
    batch.set(newSaleDocRef, {
        productId: product.id,
        productName: product.nombre,
        quantity: quantityToSell,
        salePrice: product.precioVenta,
        productCost: product.precioCompra,
        saleDate: new Date(),
        sellerEmail: user.email, 
        sellerRole: currentUserRole 
    });
    
   try {
    // 3. ¡EJECUTAR EL LOTE! (Un solo llamado atómico a Firebase)
    await batch.commit();
    
    // 🚀 CORRECCIÓN CRÍTICA: Actualización Local Inmediata
    // Esto evita que la pantalla del Vendedor se quede "pegada" con el stock viejo
    const productIndex = allProducts.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
        allProducts[productIndex].stock = newStock;
        
        // Forzamos el redibujado de la tabla de Ventas y de Inventario
        renderProducts(allProducts); // Actualiza Inventario
        renderSalesProducts(allProducts); // Actualiza Ventas
    }
    
    displayMessage(`Venta de ${quantityToSell} unidad(es) de ${product.nombre} registrada. Stock actualizado a ${newStock}.`);
} catch (e) {
    console.error("Error al registrar la venta:", e);
    displayMessage("Error al registrar la venta: " + e.message, true);
}
});
        } else if (product && product.stock <= 0) {
            displayMessage("Producto agotado. No se puede vender.", true);
        }
    }
});

// --- REPORTES (MODIFICADA PARA ADMINISTRADOR GLOBAL) ---
// Esta función ahora itera sobre todos los usuarios para consolidar todas las ventas.
const getSalesData = async (user, startDate, endDate) => {
    // Si no es Admin, se bloquea el reporte global por seguridad.
    if (currentUserRole !== 'admin') {
         displayMessage("Acceso denegado. Solo administradores pueden generar reportes globales.", true);
         return { salesData: [], totalRevenue: 0 };
    }

    const allSales = [];
    const usersCollectionRef = collection(db, "users");
    
    try {
        // Paso 1: Obtener TODOS los usuarios para iterar sus ventas
        const usersSnapshot = await getDocs(usersCollectionRef);
        
        const salesPromises = usersSnapshot.docs.map(async (userDoc) => {
            const userId = userDoc.id;
            const salesRef = collection(db, `users/${userId}/sales`);
            
            // Query: Se filtra por rango y SE ORDENA por el mismo campo (OBLIGATORIO en Firebase)
            const q = query(
                salesRef, 
                where("saleDate", ">=", startDate), 
                where("saleDate", "<", endDate), 
                orderBy("saleDate", "asc")
            );
            
            const salesSnapshot = await getDocs(q);
            
            salesSnapshot.forEach(saleDoc => {
                const sale = saleDoc.data();
                
                // Conversión de Timestamp a Date para el reporte
                let saleDateObject = sale.saleDate;
                if (sale.saleDate instanceof Timestamp) {
                    saleDateObject = sale.saleDate.toDate();
                } else if (sale.saleDate && sale.saleDate.seconds) { 
                    saleDateObject = new Date(sale.saleDate.seconds * 1000);
                } else if (!(sale.saleDate instanceof Date)) {
                    saleDateObject = new Date(); 
                }

                allSales.push({ 
                    ...sale,
                    id: saleDoc.id,
                    saleDate: saleDateObject,
                    sellerEmail: sale.sellerEmail || userDoc.data().email || userId 
                });
            });
        });
        
        await Promise.all(salesPromises); // Espera que todas las consultas de vendedores terminen

        // Cálculo de Ganancia (Revenue)
        let totalRevenue = 0;
        allSales.forEach(sale => {
            totalRevenue += sale.salePrice * sale.quantity;
        });
        
        return { salesData: allSales, totalRevenue };

    } catch (error) {
        console.error("Error al obtener todas las ventas para el reporte:", error);
        return { salesData: [], totalRevenue: 0 };
    }
}


const generateSalesPdf = async (timeframe) => {
    const user = auth.currentUser;
    if (!user || currentUserRole !== 'admin') {
        displayMessage("Solo los Administradores pueden generar reportes.", true);
        return;
    }
    loadingMessage.classList.remove('hidden');
    const now = new Date();
    let startDate, endDate, reportTitle;

       // Configuración de rangos de fechas (CORREGIDA PARA TODOS LOS PERIODOS)
    if (timeframe === 'today') {
        // Medianoche de HOY (00:00:00:000)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); 
        // Medianoche de MAÑANA (00:00:00:000)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        reportTitle = `Reporte de Ventas del Día: ${now.toLocaleDateString()}`;

    } else if (timeframe === 'month') {
        // Medianoche del día 1 del mes actual
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        // Medianoche del día 1 del siguiente mes
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        reportTitle = `Reporte de Ventas del Mes: ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

    } else if (timeframe === 'year') {
        // Medianoche del 1 de enero del año actual
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        // Medianoche del 1 de enero del año siguiente
        endDate = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
        reportTitle = `Reporte de Ventas del Año: ${now.getFullYear()}`;
    }

    const { salesData, totalRevenue } = await getSalesData(user, startDate, endDate);


    if (salesData.length === 0) {
        displayMessage("No se encontraron ventas para este periodo.", true);
        loadingMessage.classList.add('hidden');
        return;
    }

    const salesReportSection = document.getElementById('sales-report-section');
    const salesReportTableBody = document.getElementById('sales-report-table-body');
    const salesReportTitle = document.getElementById('sales-report-title');
    const salesReportTotal = document.getElementById('sales-report-total');

    salesReportTableBody.innerHTML = '';
    salesData.forEach(sale => {
        const row = document.createElement('tr');
        row.className = "bg-white border-b hover:bg-gray-50 text-gray-700";
        row.innerHTML = `
            <td class="py-2 px-4">${sale.productName}</td>
            <td class="py-2 px-4">${sale.quantity}</td>
            <td class="py-2 px-4">$${sale.salePrice.toFixed(2)}</td>
            <td class="py-2 px-4">${sale.saleDate.toLocaleString()}</td>
        `;
        salesReportTableBody.appendChild(row);
    });

    salesReportTitle.textContent = reportTitle;
    salesReportTotal.textContent = `Ventas Totales: $${totalRevenue.toFixed(2)}`;
    
    // GENERACIÓN DE PDF
    salesReportSection.classList.remove('hidden');
    // Se usa un pequeño retraso para asegurar que el DOM esté renderizado antes de html2canvas
    setTimeout(async () => {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const canvas = await html2canvas(salesReportSection, { scale: 2, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(`${reportTitle.replace(/ /g, '_').replace(/:/g, '')}.pdf`);
            salesReportSection.classList.add('hidden');
        } catch(error) {
             console.error("Error al generar el PDF de Ventas:", error);
             displayMessage("Error al generar el PDF de Ventas.", true);
        } finally {
            loadingMessage.classList.add('hidden');
        }
    }, 50); // Pequeño delay
};

const generateProfitPdf = async (timeframe) => {
    const user = auth.currentUser;
    if (!user || currentUserRole !== 'admin') {
        displayMessage("Solo los Administradores pueden generar reportes.", true);
        return;
    }
    loadingMessage.classList.remove('hidden');
    const now = new Date();
    let startDate, endDate, reportTitle;

   if (timeframe === 'today') {
        // Medianoche de HOY (00:00:00:000)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        // Medianoche de MAÑANA (00:00:00:000)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        reportTitle = `Reporte de Ganancias del Día: ${now.toLocaleDateString()}`;
    }

    const { salesData } = await getSalesData(user, startDate, endDate);
    let totalProfit = 0;
    
    const profitData = salesData.map(sale => {
        const profit = (sale.salePrice - sale.productCost) * sale.quantity;
        totalProfit += profit;
        return { ...sale, profit: profit };
    });


    if (profitData.length === 0) {
        displayMessage("No se encontraron ventas para este periodo.", true);
        loadingMessage.classList.add('hidden');
        return;
    }

    const profitReportSection = document.getElementById('profit-report-section');
    const profitReportTableBody = document.getElementById('profit-report-table-body');
    const profitReportTitle = document.getElementById('profit-report-title');
    const profitReportTotal = document.getElementById('profit-report-total');

    profitReportTableBody.innerHTML = '';
    profitData.forEach(sale => {
        const row = document.createElement('tr');
        row.className = "bg-white border-b hover:bg-gray-50 text-gray-700";
        row.innerHTML = `
            <td class="py-2 px-4">${sale.productName}</td>
            <td class="py-2 px-4">${sale.quantity}</td>
            <td class="py-2 px-4">$${sale.salePrice.toFixed(2)}</td>
            <td class="py-2 px-4">$${sale.productCost.toFixed(2)}</td>
            <td class="py-2 px-4">$${sale.profit.toFixed(2)}</td>
            <td class="py-2 px-4">${sale.saleDate.toLocaleString()}</td>
        `;
        profitReportTableBody.appendChild(row);
    });

    profitReportTitle.textContent = reportTitle;
    profitReportTotal.textContent = `Ganancia Total: $${totalProfit.toFixed(2)}`;
    
    // GENERACIÓN DE PDF
    profitReportSection.classList.remove('hidden');
    setTimeout(async () => {
         try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const canvas = await html2canvas(profitReportSection, { scale: 2, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(`${reportTitle.replace(/ /g, '_').replace(/:/g, '')}.pdf`);
            profitReportSection.classList.add('hidden');
        } catch(error) {
             console.error("Error al generar el PDF de Ganancias:", error);
             displayMessage("Error al generar el PDF de Ganancias.", true);
        } finally {
            loadingMessage.classList.add('hidden');
        }
    }, 50); // Pequeño delay
};

exportLowStockPdfButton.addEventListener('click', async () => {
    if (currentUserRole !== 'admin') {
        displayMessage("Solo los Administradores pueden generar este reporte.", true);
        return;
    }
    
    loadingMessage.classList.remove('hidden');
    const lowStockProducts = allProducts.filter(p => p.stock < 10);
    const lowStockReportSection = document.getElementById('low-stock-report-section');
    const lowStockTableBody = document.getElementById('low-stock-table-body');
    lowStockTableBody.innerHTML = '';
    
    if (lowStockProducts.length === 0) {
        lowStockTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay productos con bajo inventario.</td></tr>';
    } else {
        lowStockProducts.forEach((product) => {
            const row = document.createElement('tr');
            row.className = "bg-red-50 text-red-800 border-b";
            const imageUrl = product.imagen || "https://placehold.co/50x50/e2e8f0/64748b?text=N/A";
            row.innerHTML = `
                <td class="py-2 px-4 flex items-center justify-center">
                    <img src="${imageUrl}" onerror="this.onerror=null; this.src='https://placehold.co/50x50/374151/d1d5db?text=N/A';" alt="Imagen de ${product.nombre}" class="w-20 h-20 rounded-lg object-cover shadow-sm">
                </td>
                <td class="py-2 px-4">${product.nombre}</td>
                <td class="py-2 px-4">${product.marca}</td>
                <td class="py-2 px-4">${product.stock}</td>
                <td class="py-2 px-4">${product.proveedor}</td>
                <td class="py-2 px-4">$${product.precioVenta.toFixed(2)}</td>
            `;
            lowStockTableBody.appendChild(row);
        });
    }
    
    // GENERACIÓN DE PDF
    lowStockReportSection.classList.remove('hidden');
    setTimeout(async () => {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const canvas = await html2canvas(lowStockReportSection, { scale: 2, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 10; // Iniciar con un margen

            // Primera página
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Páginas adicionales si el contenido es largo
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + 10; // Ajustar la posición para el siguiente recorte
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save('reporte_inventario_bajo.pdf');
            lowStockReportSection.classList.add('hidden');
        } catch(error) {
             console.error("Error al generar el PDF de Inventario Bajo:", error);
             displayMessage("Error al generar el PDF de Inventario Bajo.", true);
        } finally {
            loadingMessage.classList.add('hidden');
        }
    }, 50); // Pequeño delay
});

salesReportTodayButton.addEventListener('click', () => generateSalesPdf('today'));
salesReportMonthButton.addEventListener('click', () => generateSalesPdf('month'));
salesReportYearButton.addEventListener('click', () => generateSalesPdf('year'));
salesReportProfitButton.addEventListener('click', () => generateProfitPdf('today'));

// ========================================================
// --- GESTIÓN DE USUARIOS Y ROLES (CÓDIGO FINAL VERIFICADO) ---
// ========================================================

const usersTableBody = document.getElementById('users-table-body');
const pendingUsersTableBody = document.getElementById('pending-users-table-body');

// 1. Funciones de Acción (Autorizar / Eliminar)
async function authorizeUser(uid, roleToAssign = 'seller') {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            status: 'approved',
            role: roleToAssign, 
            authorizedAt: Timestamp.now()
        });
        displayMessage(`Usuario autorizado y asignado como ${roleToAssign}.`, false, 3000);
    } catch (error) {
        console.error("Error al autorizar usuario:", error);
        displayMessage("Error al intentar autorizar al usuario.", true);
    }
}

async function deleteUser(uid, email) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el registro de ${email}? Esto le negará el acceso al sistema.`)) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, "users", uid));
        displayMessage(`Registro de usuario ${email} eliminado con éxito.`, false, 3000);
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        displayMessage("Error al intentar eliminar el registro del usuario.", true);
    }
}


// 2. Renderizar Tabla de Usuarios APROBADOS (Histórico)
function renderUsersTable(usersArray) {
    usersTableBody.innerHTML = '';
    
    if (currentUserRole !== 'admin' || usersArray.length === 0) {
        if (currentUserRole === 'admin') {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="py-3 px-4 text-center text-gray-400">No hay usuarios activos.</td></tr>';
        }
        return;
    }

    usersArray.forEach((user) => {
        const uid = user.uid;
        const email = user.email || 'Error: Email no encontrado'; 
        const role = user.role || 'seller'; 

        const statusClass = 'bg-green-800 text-green-300';
        const statusText = 'APROBADO'; 

        const row = document.createElement('tr');
        row.className = `border-b border-gray-700 hover:bg-gray-700 text-gray-200`;
        row.dataset.uid = uid;
        row.innerHTML = `
            <td class="py-2 px-4 text-base">${email}</td>
            <td class="py-2 px-4 text-xs">${uid}</td>
            <td class="py-2 px-4">
                <select data-uid="${uid}" class="role-select p-1 rounded-lg bg-gray-600 text-white border border-gray-500">
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="seller" ${role === 'seller' ? 'selected' : ''}>Vendedor</option>
                </select>
            </td>
            <td class="py-2 px-4"><span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">${statusText}</span></td>
            <td class="py-2 px-4 flex space-x-2">
                <button data-uid="${uid}" class="save-role-button bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-all text-sm">Guardar Rol</button>
                <button data-uid="${uid}" data-email="${email}" class="delete-btn bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-all text-sm">Eliminar</button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });
    
    // Listener para el botón de eliminación
    usersTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            const email = e.target.dataset.email;
            deleteUser(uid, email);
        });
    });
}


// 3. Renderizar Tabla de Usuarios PENDIENTES
function renderPendingUsersTable(pendingUsersArray) {
    pendingUsersTableBody.innerHTML = ''; 

    if (pendingUsersArray.length === 0) {
        pendingUsersTableBody.innerHTML = '<tr><td colspan="3" class="py-3 px-4 text-center text-gray-400">No hay solicitudes pendientes de autorización.</td></tr>';
        return;
    }

    pendingUsersArray.forEach(user => {
        const row = document.createElement('tr');
        row.classList.add('border-b', 'border-gray-700', 'hover:bg-gray-700', 'transition-colors');

        const actionContent = `
            <button data-uid="${user.uid}" class="authorize-pending-btn bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 transition-all">Autorizar</button>
            <span class="mx-1"></span>
            <button data-uid="${user.uid}" data-email="${user.email}" class="delete-btn bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 transition-all">Eliminar</button>
        `;

        row.innerHTML = `
            <td class="py-3 px-4">${user.email}</td>
            <td class="py-3 px-4 text-xs text-gray-400">${user.uid}</td>
            <td class="py-3 px-4 flex space-x-2">${actionContent}</td>
        `;

        pendingUsersTableBody.appendChild(row);
    });

    // Listener para los botones de Autorización PENDIENTE
    pendingUsersTableBody.querySelectorAll('.authorize-pending-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            authorizeUser(uid, 'seller'); 
        });
    });
    
    // Listener para los botones de Eliminación en la tabla pendiente
    pendingUsersTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            const email = e.target.dataset.email;
            deleteUser(uid, email);
        });
    });
}


// 4. Cargar Usuarios (Escuchando Cambios en Tiempo Real)
function fetchAndRenderUsers() {
    if (currentUserRole !== 'admin') return; 
    
    const usersRef = collection(db, "users");
    
    // onSnapshot lee los datos en tiempo real y renderiza ambas tablas
    onSnapshot(usersRef, (snapshot) => {
        const approvedUsers = [];
        const pendingUsers = [];
        
        snapshot.forEach((doc) => {
            const userData = {
                uid: doc.id,
                ...doc.data()
            };

            if (userData.status === 'pending') {
                pendingUsers.push(userData);
            } else {
                approvedUsers.push(userData);
            }
        });
        
        renderUsersTable(approvedUsers); // Tabla Histórico/Aprobados
        renderPendingUsersTable(pendingUsers); // Tabla Pendientes
    });
}

// 5. Listener de la Tabla Principal para Guardar Rol
usersTableBody.addEventListener('click', async (e) => {
    
    if (e.target.classList.contains('save-role-button')) {
        if (currentUserRole !== 'admin') {
            displayMessage("Acceso denegado. Solo administradores pueden cambiar roles.", true);
            return;
        }

        const uid = e.target.dataset.uid;
        const selectElement = usersTableBody.querySelector(`select[data-uid="${uid}"]`);
        const newRole = selectElement.value;
        
        try {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { role: newRole }); 
            displayMessage(`Rol de usuario actualizado a ${newRole} (UID: ${uid.substring(0, 5)}...)`);

            if (uid === auth.currentUser.uid && newRole !== currentUserRole) {
                currentUserRole = newRole; 
                updateNavVisibility(newRole); 
                displayMessage("Tu propio rol ha sido cambiado. El menú se ha actualizado.", true);
            }
            
        } catch (error) {
            console.error("Error al actualizar el rol:", error);
            displayMessage("Error al actualizar el rol: " + error.message, true);
        }
    }
});
function updateNavVisibility(role) {
    const isAdmin = role === 'admin';

    // Pestañas visibles solo para Admin
    if (addProductTabButton) {
        addProductTabButton.classList.toggle('hidden', !isAdmin);
    }
    if (reportsTabButton) {
        reportsTabButton.classList.toggle('hidden', !isAdmin);
    }
    if (usersTabButton) {
        usersTabButton.classList.toggle('hidden', !isAdmin);
    }
    
    // Quitar la clase 'active' de todas las secciones al ocultar la pestaña
    if (!isAdmin && contentSections.some(sec => sec.id === 'product-form-section' || sec.id === 'reports-section' || sec.id === 'users-management-section')) {
        // Asegurar que si una pestaña de Admin está visible, se cambie a una visible
        showTab(salesSection); 
    }
}


// --- RENDERIZACIÓN DE TABLAS ---
function renderProducts(products) {
    inventoryTableBody.innerHTML = '';
    
    // Se deja el manejo de visibilidad de botones en updateActionButtons, que se llama al final.
    
    products.forEach((product, index) => {
        const row = document.createElement('tr');
        // Alternar colores de fila para mejor legibilidad
        row.className = `border-b hover:bg-gray-700 cursor-pointer text-gray-200 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}`;
        row.dataset.id = product.id;
        const imageUrl = product.imagen || "https://placehold.co/50x50/374151/d1d5db?text=N/A";
        const stockColor = product.stock < 10 ? 'text-red-400 font-bold' : 'text-gray-200';
        
        // El costo de compra (precioCompra) solo debe ser visible para el Admin
        const costCell = currentUserRole === 'admin' ? 
            `<td class="py-2 px-4 text-base text-green-400">$${product.precioCompra.toFixed(2)}</td>` : 
            `<td class="py-2 px-4 text-base text-gray-500">***</td>`; // Ocultar para Vendedor
            
        row.innerHTML = `
            <td class="py-2 px-4 flex items-center justify-center">
                <img src="${imageUrl}" onerror="this.onerror=null; this.src='https://placehold.co/50x50/374151/d1d5db?text=N/A';" alt="Imagen de ${product.nombre}" class="w-20 h-20 rounded-lg object-cover shadow-sm">
            </td>
            <td class="py-2 px-4 text-base">${product.nombre}</td>
            <td class="py-2 px-4 text-base">${product.marca}</td>
            <td class="py-2 px-4 text-base">${product.categoria}</td>
            <td class="py-2 px-4 text-base">${product.proveedor}</td>
            <td class="py-2 px-4 text-base ${stockColor}">${product.stock}</td>
            ${costCell} 
            <td class="py-2 px-4 text-base text-blue-400">$${product.precioVenta.toFixed(2)}</td>
        `;
        inventoryTableBody.appendChild(row);
    });
}

function renderSalesProducts(products) {
    salesTableBody.innerHTML = '';
    products.forEach((product) => {
        const row = document.createElement('tr');
        row.className = "bg-gray-800 border-b hover:bg-gray-700 text-gray-200";
        const stockColor = product.stock < 10 ? 'text-red-400 font-bold' : 'text-gray-200';
        const imageUrl = product.imagen || "https://placehold.co/50x50/374151/d1d5db?text=N/A";
        
        // Deshabilitar botón de venta si no hay stock
        const sellButtonDisabled = product.stock <= 0 ? 'disabled' : '';
        const sellButtonClass = product.stock <= 0 ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700';

        row.innerHTML = `
            <td class="py-2 px-4 flex items-center justify-center">
                <img src="${imageUrl}" onerror="this.onerror=null; this.src='https://placehold.co/50x50/374151/d1d5db?text=N/A';" alt="Imagen de ${product.nombre}" class="w-20 h-20 rounded-lg object-cover shadow-sm">
            </td>
            <td class="py-2 px-4 text-base">${product.nombre}</td>
            <td class="py-2 px-4 text-base">${product.marca}</td>
            <td class="py-2 px-4 text-base ${stockColor}">${product.stock}</td>
            <td class="py-2 px-4 text-base text-blue-400">$${product.precioVenta.toFixed(2)}</td>
            <td class="py-2 px-4">
                <button class="sell-button text-white px-4 py-2 rounded-lg transition-all text-base ${sellButtonClass}" data-id="${product.id}" ${sellButtonDisabled}>
                    Vender
                </button>
            </td>
        `;
        salesTableBody.appendChild(row);
    });
}

function loadProducts(userId) {
    const productsRef = collection(db, "products"); 
    let q;

    // LÓGICA DE VISIBILIDAD DE PRODUCTOS (se mantuvo tu lógica original)
    if (currentUserRole === 'admin') {
        q = query(productsRef, orderBy("createdAt", "desc"));
    } else {
        // Vendedor solo ve los que él creó (si el Admin sube productos, el Vendedor no los verá)
       q = query(productsRef, orderBy("createdAt", "desc"));
    }

    onSnapshot(q, (querySnapshot) => {
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        renderProducts(allProducts);
        renderSalesProducts(allProducts);
        editingProductId = null;
        updateActionButtons(null);
    });
}

// --- EVENT LISTENERS DE NAVEGACIÓN ---
inventoryTabButton.addEventListener('click', () => showTab(inventorySection));
addProductTabButton.addEventListener('click', () => {
    resetForm();
    showTab(productFormSection);
});
usersTabButton.addEventListener('click', () => {
    // 1. Muestra la sección de gestión de usuarios
    showTab(usersManagementSection); // O usa toggleSections si la definiste así
    
    // 2. 🚨 FUNCIÓN CLAVE: Carga los datos de usuarios desde Firestore y los dibuja en las tablas 🚨
    fetchAndRenderUsers(); 
});
reportsTabButton.addEventListener('click', () => showTab(reportsSection));
salesTabButton.addEventListener('click', () => showTab(salesSection));

// --- MENÚ DE HAMBURGUESA (RESPONSIVO) ---
const menuButton = document.getElementById('menu-button');
const mainNav = document.getElementById('main-nav');

if (menuButton && mainNav) {
    menuButton.addEventListener('click', () => {
        // Alternar entre 'hidden' y 'flex' para mostrar/ocultar el menú
        mainNav.classList.toggle('hidden');
        mainNav.classList.toggle('flex');
    });
    // Opcional: Cerrar menú después de seleccionar
    mainNav.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
             if (window.innerWidth < 768) { // Cierra solo en móviles
                 mainNav.classList.add('hidden');
                 mainNav.classList.remove('flex');
             }
        });
    });
}

// --- RECUPERACIÓN DE CONTRASEÑA ---
const forgotPasswordLink = document.getElementById('forgot-password-link');

forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;

    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            displayMessage("Se ha enviado un correo de recuperación a tu dirección de email.");
        } catch (error) {
            console.error("Error al enviar el correo:", error.message);
            // Mensaje genérico por seguridad (para no revelar si el email existe o no)
            displayMessage("Si la dirección de correo es válida, recibirás un enlace de recuperación.", true);
        }
    } else {
        displayMessage("Por favor, introduce tu correo electrónico en el campo para recuperar tu contraseña.", true);
    }
});