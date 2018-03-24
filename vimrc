:autocmd BufWritePost *.js silent! !prettierme <afile> >/dev/null 2>&1
:autocmd BufWritePost *.js silent! e | redraw! | SyntasticCheck | SignifyRefresh
