// /*
//  * DataTables - Tables
//  */


// $(function () {

//   // Simple Data Table

//   $('#data-table-simple').DataTable({
//     "responsive": true,
//   });

//   // Row Grouping Table

//   var table = $('#data-table-row-grouping').DataTable({
//     "responsive": true,
//     "columnDefs": [{
//       "visible": false,
//       "targets": 2
//     }],
//     "order": [
//       [2, 'asc']
//     ],
//     "displayLength": 25,
//     "drawCallback": function (settings) {
//       var api = this.api();
//       var rows = api.rows({
//         page: 'current'
//       }).nodes();
//       var last = null;

//       api.column(2, {
//         page: 'current'
//       }).data().each(function (group, i) {
//         if (last !== group) {
//           $(rows).eq(i).before(
//             '<tr class="group"><td colspan="5">' + group + '</td></tr>'
//           );

//           last = group;
//         }
//       });
//     }
//   });

//   // Page Length Option Table

//   $('#page-length-option').DataTable({
//     "responsive": true,
//     "lengthMenu": [
//       [10, 25, 50, -1],
//       [10, 25, 50, "All"]
//     ]
//   });

//   // Dynmaic Scroll table

//   $('#scroll-dynamic').DataTable({
//     "responsive": true,
//     scrollY: '50vh',
//     scrollCollapse: true,
//     paging: false
//   })

//   // Horizontal And Vertical Scroll Table

//   $('#scroll-vert-hor').DataTable({
//     "scrollY": 200,
//     "scrollX": true
//   })

//   // Multi Select Table

//   $('#multi-select').DataTable({
//     responsive: true,
//     "paging": true,
//     "ordering": false,
//     "info": false,
//     "columnDefs": [{
//       "visible": false,
//       "targets": 2
//     }],


//   });

// });



// // Datatable click on select issue fix
// $(window).on('load', function () {
//   $(".dropdown-content.select-dropdown li").on("click", function () {
//     var that = this;
//     setTimeout(function () {
//       if ($(that).parent().parent().find('.select-dropdown').hasClass('active')) {
//         // $(that).parent().removeClass('active');
//         $(that).parent().parent().find('.select-dropdown').removeClass('active');
//         $(that).parent().hide();
//       }
//     }, 100);
//   });
// });

// var checkbox = $('#multi-select tbody tr th input')
// var selectAll = $('#multi-select .select-all')

// // Select A Row Function

// $(document).ready(function () {
//   checkbox.on('click', function () {
//     $(this).parent().parent().parent().toggleClass('selected');
//   })

//   checkbox.on('click', function () {
//     if ($(this).attr("checked")) {
//       $(this).attr('checked', false);
//     } else {
//       $(this).attr('checked', true);
//     }
//   })

//   // —————————————————————————————————————
//   // CALENDAR (Datepicker)
//   // —————————————————————————————————————
//   $('.datepicker').datepicker({
//     format: 'yyyy-mm-dd',
//     autoClose: true,
//     yearRange: [2020, new Date().getFullYear() + 5],
//     showClearBtn: true,
//     i18n: {
//       cancel: 'Cancel',
//       clear: 'Clear',
//       done: 'Ok',
//       months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
//       monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
//       weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
//       weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
//       weekdaysAbbrev: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
//     }
//   });

//   // Select Every Row 

//   selectAll.on('click', function () {
//     $(this).toggleClass('clicked');
//     if (selectAll.hasClass('clicked')) {
//       $('#multi-select tbody tr').addClass('selected');
//     } else {
//       $('#multi-select tbody tr').removeClass('selected');
//     }

//     if ($('#multi-select tbody tr').hasClass('selected')) {
//       checkbox.prop('checked', true);

//     } else {
//       checkbox.prop('checked', false);

//     }
//   })
// })


/*
 * DataTables - Tables
//  */

// $(function () {

//   // Simple Data Table
//   $('#data-table-simple').DataTable({
//     "responsive": true,
//   });

//   // Row Grouping Table
//   var table = $('#data-table-row-grouping').DataTable({
//     "responsive": true,
//     "columnDefs": [{
//       "visible": false,
//       "targets": 2
//     }],
//     "order": [
//       [2, 'asc']
//     ],
//     "displayLength": 25,
//     "drawCallback": function (settings) {
//       var api = this.api();
//       var rows = api.rows({ page: 'current' }).nodes();
//       var last = null;

//       api.column(2, { page: 'current' }).data().each(function (group, i) {
//         if (last !== group) {
//           $(rows).eq(i).before(
//             '<tr class="group"><td colspan="5">' + group + '</td></tr>'
//           );
//           last = group;
//         }
//       });
//     }
//   });

//   // Page Length Option Table
//   $('#page-length-option').DataTable({
//     "responsive": true,
//     "lengthMenu": [
//       [10, 25, 50, -1],
//       [10, 25, 50, "All"]
//     ]
//   });

//   // Dynamic Scroll Table
//   $('#scroll-dynamic').DataTable({
//     "responsive": true,
//     scrollY: '50vh',
//     scrollCollapse: true,
//     paging: false
//   });

//   // Horizontal And Vertical Scroll Table
//   $('#scroll-vert-hor').DataTable({
//     "scrollY": 200,
//     "scrollX": true
//   });

//   // Multi Select Table
//   $('#multi-select').DataTable({
//     responsive: true,
//     "paging": true,
//     "ordering": false,
//     "info": false,
//     "columnDefs": [{
//       "visible": false,
//       "targets": 2
//     }],
//   });

//   // ✅ Vendor View - Branches Table
//   if ($('#branches-table').length && !$.fn.DataTable.isDataTable('#branches-table')) {
//     $('#branches-table').DataTable({
//       responsive: true,
//       order: [[0, 'asc']],
//       drawCallback: function () {
//         var api = this.api();
//         var start = api.context[0]._iDisplayStart;
//         api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
//           cell.innerHTML = start + i + 1;
//         });
//       }
//     });
//   }

//   // ✅ Vendor View - Staff Table
//   if ($('#staff-table').length && !$.fn.DataTable.isDataTable('#staff-table')) {
//     $('#staff-table').DataTable({
//       responsive: true,
//       order: [[0, 'asc']],
//       drawCallback: function () {
//         var api = this.api();
//         var start = api.context[0]._iDisplayStart;
//         api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
//           cell.innerHTML = start + i + 1;
//         });
//       }
//     });
//   }

//   // ✅ Vendor View - Transactions Table
//   if ($('#transactions-table').length && !$.fn.DataTable.isDataTable('#transactions-table')) {
//     $('#transactions-table').DataTable({
//       responsive: true,
//       order: [[1, 'desc']],
//       pageLength: 25,
//       columnDefs: [
//         { targets: [0], orderable: false },
//         { targets: [4, 5], orderable: false }
//       ],
//       drawCallback: function () {
//         var api = this.api();
//         var start = api.context[0]._iDisplayStart;
//         api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
//           cell.innerHTML = start + i + 1;
//         });
//       }
//     });
//   }

// });   


// // Datatable click on select issue fix
// $(window).on('load', function () {
//   $(".dropdown-content.select-dropdown li").on("click", function () {
//     var that = this;
//     setTimeout(function () {
//       if ($(that).parent().parent().find('.select-dropdown').hasClass('active')) {
//         $(that).parent().parent().find('.select-dropdown').removeClass('active');
//         $(that).parent().hide();
//       }
//     }, 100);
//   });
// });

// var checkbox = $('#multi-select tbody tr th input');
// var selectAll = $('#multi-select .select-all');

// // Select A Row Function
// $(document).ready(function () {
//   checkbox.on('click', function () {
//     $(this).parent().parent().parent().toggleClass('selected');
//   });

//   checkbox.on('click', function () {
//     if ($(this).attr("checked")) {
//       $(this).attr('checked', false);
//     } else {
//       $(this).attr('checked', true);
//     }
//   });

//   // CALENDAR (Datepicker)
//   $('.datepicker').datepicker({
//     format: 'yyyy-mm-dd',
//     autoClose: true,
//     yearRange: [2020, new Date().getFullYear() + 5],
//     showClearBtn: true,
//     i18n: {
//       cancel: 'Cancel',
//       clear: 'Clear',
//       done: 'Ok',
//       months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
//       monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
//       weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
//       weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
//       weekdaysAbbrev: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
//     }
//   });

//   // Select Every Row
//   selectAll.on('click', function () {
//     $(this).toggleClass('clicked');
//     if (selectAll.hasClass('clicked')) {
//       $('#multi-select tbody tr').addClass('selected');
//     } else {
//       $('#multi-select tbody tr').removeClass('selected');
//     }

//     if ($('#multi-select tbody tr').hasClass('selected')) {
//       checkbox.prop('checked', true);
//     } else {
//       checkbox.prop('checked', false);
//     }
//   });
// });

/*
 * DataTables - Tables
 */

$(function () {

  // Simple Data Table
  $('#data-table-simple').DataTable({
    "responsive": true,
  });

  // Row Grouping Table
  var table = $('#data-table-row-grouping').DataTable({
    "responsive": true,
    "columnDefs": [{
      "visible": false,
      "targets": 2
    }],
    "order": [
      [2, 'asc']
    ],
    "displayLength": 25,
    "drawCallback": function (settings) {
      var api = this.api();
      var rows = api.rows({ page: 'current' }).nodes();
      var last = null;

      api.column(2, { page: 'current' }).data().each(function (group, i) {
        if (last !== group) {
          $(rows).eq(i).before(
            '<tr class="group"><td colspan="5">' + group + '</td></tr>'
          );
          last = group;
        }
      });
    }
  });

  // Page Length Option Table
  $('#page-length-option').DataTable({
    "responsive": true,
    "lengthMenu": [
      [10, 25, 50, -1],
      [10, 25, 50, "All"]
    ]
  });

  // Dynamic Scroll Table
  $('#scroll-dynamic').DataTable({
    "responsive": true,
    scrollY: '50vh',
    scrollCollapse: true,
    paging: false
  });

  // Horizontal And Vertical Scroll Table
  $('#scroll-vert-hor').DataTable({
    "scrollY": 200,
    "scrollX": true
  });

  // Multi Select Table
  $('#multi-select').DataTable({
    responsive: true,
    "paging": true,
    "ordering": false,
    "info": false,
    "columnDefs": [{
      "visible": false,
      "targets": 2
    }],
  });

  // ✅ Vendor View - Branches Table
  if ($('#branches-table').length && !$.fn.DataTable.isDataTable('#branches-table')) {
    $('#branches-table').DataTable({
      responsive: true,
      order: [[0, 'asc']],
      drawCallback: function () {
        var api = this.api();
        var start = api.context[0]._iDisplayStart;
        api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
          cell.innerHTML = start + i + 1;
        });
      }
    });
  }

  // ✅ Vendor View - Staff Table
  if ($('#staff-table').length && !$.fn.DataTable.isDataTable('#staff-table')) {
    $('#staff-table').DataTable({
      responsive: true,
      order: [[0, 'asc']],
      drawCallback: function () {
        var api = this.api();
        var start = api.context[0]._iDisplayStart;
        api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
          cell.innerHTML = start + i + 1;
        });
      }
    });
  }

  // ✅ Vendor View - Transactions Table (latest first, custom DD-MM-YYYY date sort)
  if ($('#transactions-table').length && !$.fn.DataTable.isDataTable('#transactions-table')) {

    // Custom date type: parses "DD-MM-YYYY HH:MM" into a sortable timestamp
    $.fn.dataTable.ext.type.order['date-dd-mm-yyyy-pre'] = function (d) {
      if (!d) return 0;
      var parts = d.trim().split(' ');
      var dateParts = parts[0].split('-');          // [DD, MM, YYYY]
      var timeParts = (parts[1] || '00:00').split(':'); // [HH, MM]
      return new Date(
        parseInt(dateParts[2], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[0], 10),
        parseInt(timeParts[0], 10),
        parseInt(timeParts[1], 10)
      ).getTime();
    };

    $('#transactions-table').DataTable({
      responsive: true,
      order: [[1, 'desc']],   // ✅ Date column descending = latest transaction first
      pageLength: 25,
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']],
      columnDefs: [
        { targets: [0], orderable: false },             // Sr - not sortable
        { targets: [1], type: 'date-dd-mm-yyyy' },      // Date - custom sort
        { targets: [4, 5], orderable: false }            // Items, Quantity - not sortable
      ],
      drawCallback: function () {
        var api = this.api();
        var start = api.context[0]._iDisplayStart;
        api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
          cell.innerHTML = start + i + 1;
        });
      }
    });
  }

});


// Datatable click on select issue fix
$(window).on('load', function () {
  $(".dropdown-content.select-dropdown li").on("click", function () {
    var that = this;
    setTimeout(function () {
      if ($(that).parent().parent().find('.select-dropdown').hasClass('active')) {
        $(that).parent().parent().find('.select-dropdown').removeClass('active');
        $(that).parent().hide();
      }
    }, 100);
  });
});

var checkbox = $('#multi-select tbody tr th input');
var selectAll = $('#multi-select .select-all');

// Select A Row Function
$(document).ready(function () {
  checkbox.on('click', function () {
    $(this).parent().parent().parent().toggleClass('selected');
  });

  checkbox.on('click', function () {
    if ($(this).attr("checked")) {
      $(this).attr('checked', false);
    } else {
      $(this).attr('checked', true);
    }
  });

  // CALENDAR (Datepicker)
  $('.datepicker').datepicker({
    format: 'yyyy-mm-dd',
    autoClose: true,
    yearRange: [2020, new Date().getFullYear() + 5],
    showClearBtn: true,
    i18n: {
      cancel: 'Cancel',
      clear: 'Clear',
      done: 'Ok',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      weekdaysAbbrev: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    }
  });

  // Select Every Row
  selectAll.on('click', function () {
    $(this).toggleClass('clicked');
    if (selectAll.hasClass('clicked')) {
      $('#multi-select tbody tr').addClass('selected');
    } else {
      $('#multi-select tbody tr').removeClass('selected');
    }

    if ($('#multi-select tbody tr').hasClass('selected')) {
      checkbox.prop('checked', true);
    } else {
      checkbox.prop('checked', false);
    }
  });
});