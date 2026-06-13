var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// 🌟 ADICIONADO: Módulo de sessão necessário para o teu 'protegerRota' funcionar
var session = require('express-session'); 

// 🌟 CORREÇÃO: Apontar para o teu ficheiro correto onde unificaste as rotas do projeto
var indexRoutes = require('./routes/indexRoutes');
var usersRouter = require('./routes/users');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 🌟 ADICIONADO: Configuração básica de Sessão (deve vir ANTES das rotas!)
app.use(session({
  secret: 'mngr_secret_key_12345', // Pode ser qualquer frase segura
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Define como true se usares HTTPS no futuro
}));

// Servir ficheiros estáticos (Imagens, CSS, JS do Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// 🌟 CORREÇÃO: Ativar o teu roteador unificado na raiz do projeto
app.use('/', indexRoutes);
app.use('/users', usersRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;